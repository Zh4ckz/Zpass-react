from pathlib import Path
p=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass\LoginApprovalDialog.kt');s=p.read_text(encoding='utf-8');tail=s[s.index('/**\n * Shows the account'):] 
head='''package com.zpass

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
import com.zpass.security.LoginApproval
import com.zpass.security.LoginRequest
import com.zpass.security.WebLoginAuth
import com.zpass.security.ApprovalNavigation
import com.zpass.notifications.ApprovalNotifications
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Approval is allowed only after a fresh Android PIN/biometric check, even with the vault locked. */
@Composable
fun LoginApprovalHost() {
    val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
    val context = LocalContext.current
    val hostScope = rememberCoroutineScope()
    val preferredId by ApprovalNavigation.requestId.collectAsState()
    var request by remember(uid) { mutableStateOf<LoginRequest?>(null) }
    var listenerError by remember(uid) { mutableStateOf(false) }
    var expired by remember(uid) { mutableStateOf(false) }
    var retry by remember(uid) { mutableIntStateOf(0) }
    LaunchedEffect(uid, retry, preferredId) {
        listenerError = false
        try {
            LoginApproval.listenPendingRequest(uid, preferredId).collect { next ->
                request?.takeIf { it.id != next?.id }?.let { ApprovalNotifications.cancel(context, it.id) }
                request = next
                if (next == null && preferredId != null) {
                    ApprovalNotifications.cancel(context, preferredId!!)
                    ApprovalNavigation.clear(preferredId)
                    expired = true
                }
            }
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { request = null; listenerError = true }
    }
    if (listenerError || expired) {
        AlertDialog(onDismissRequest = { listenerError=false;expired=false },
            title = { Text(stringResource(if(expired) R.string.approval_expired else R.string.approval_unavailable)) },
            text = { Text(stringResource(if(expired) R.string.approval_help else R.string.approval_error)) },
            confirmButton = { TextButton(onClick = { if(!expired)retry++;listenerError=false;expired=false }) { Text(stringResource(if(expired) R.string.approval_close else R.string.approval_retry)) } })
    }
    val pending = request ?: return
    key(pending.id) {
        fun close() {
            if (request?.id == pending.id) request = null
            ApprovalNotifications.cancel(context, pending.id)
            ApprovalNavigation.clear(pending.id)
        }
        NumberMatchingApproval(pending, onClosed = ::close, onExpired = {
            close(); expired=true
            hostScope.launch { runCatching { LoginApproval.deny(pending.id) } }
        })
    }
}

@Composable
private fun NumberMatchingApproval(pending: LoginRequest, onClosed: () -> Unit, onExpired: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var responding by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var seconds by remember { mutableIntStateOf(60) }
    var choosing by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<String?>(null) }
    var showHelp by remember { mutableStateOf(false) }
    fun text(id: Int) = context.getString(id)
    LaunchedEffect(pending.id, pending.expiresAtMillis) {
        while (true) {
            val remaining = pending.expiresAtMillis - System.currentTimeMillis()
            seconds = ((remaining + 999) / 1000).toInt().coerceIn(0, 60)
            if (remaining <= 0) { onExpired(); break }
            delay(250)
        }
    }
    fun completeApproval(code: String) {
        if (System.currentTimeMillis() >= pending.expiresAtMillis) { onExpired(); return }
        responding=true
        scope.launch {
            try {
                val secret = if (pending.purpose == "CARD_VIEW") "" else {
                    val uid = FirebaseAuth.getInstance().currentUser?.uid ?: throw IllegalStateException()
                    val status=WebLoginAuth.fetchStatus(uid)
                    status.secret?.takeIf { status.enabled && it.isNotBlank() } ?: run { error=text(R.string.approval_login_disabled);return@launch }
                }
                if(LoginApproval.respond(pending.id,code,pending.displayCode,secret))onClosed()
                else error=text(R.string.approval_expired)
            } catch(cancelled: CancellationException) { throw cancelled }
            catch(_:Exception) { error=text(R.string.approval_error) }
            finally {responding=false}
        }
    }
    val credentialLauncher=androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { result ->
        if(result.resultCode==android.app.Activity.RESULT_OK && selected!=null)completeApproval(selected!!)
        else {responding=false;error=text(R.string.approval_cancelled)}
    }
    fun approve(code: String) {
        if(responding || seconds==0)return
        if(code!=pending.displayCode){error=text(R.string.approval_mismatch);return}
        val keyguard=context.getSystemService(android.content.Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
        if(!keyguard.isDeviceSecure){error=text(R.string.approval_pin);return}
        responding=true;error=null
        val activity=generateSequence<android.content.Context>(context) { (it as? android.content.ContextWrapper)?.baseContext }.filterIsInstance<androidx.fragment.app.FragmentActivity>().firstOrNull()
        if(android.os.Build.VERSION.SDK_INT>=30 && activity!=null){
            com.zpass.security.BiometricPromptHelper(activity).showBiometricPrompt("Z Pass",text(R.string.approval_verify),
                onSuccess={completeApproval(code)},onError={_,_->responding=false;error=text(R.string.approval_cancelled)})
        } else {
            val intent=keyguard.createConfirmDeviceCredentialIntent("Z Pass",text(R.string.approval_verify))
            if(intent!=null)credentialLauncher.launch(intent) else {responding=false;error=text(R.string.approval_pin)}
        }
    }
    fun deny() {
        if(responding)return
        responding=true
        scope.launch {
            try {LoginApproval.deny(pending.id);onClosed()}
            catch(cancelled:CancellationException){throw cancelled}
            catch(_:Exception){error=text(R.string.approval_error)}
            finally{responding=false}
        }
    }
    AlertDialog(onDismissRequest=::deny,shape=RoundedCornerShape(28.dp),
        icon={Icon(Icons.Default.Devices,contentDescription=null,tint=MaterialTheme.colorScheme.primary)},
        title={Text(stringResource(R.string.approval_question),fontWeight=FontWeight.Bold)},
        text={Column(Modifier.heightIn(max=400.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(14.dp)) {
            Text(stringResource(if(pending.purpose=="CARD_VIEW")R.string.approval_title_card else R.string.approval_title_signin),fontWeight=FontWeight.SemiBold)
            Surface(shape=RoundedCornerShape(16.dp),color=MaterialTheme.colorScheme.surfaceContainerHigh){
                Column(Modifier.fillMaxWidth().padding(16.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){
                    Text(stringResource(R.string.approval_device,pending.deviceLabel))
                    val location=if(pending.locationLabel.isBlank() || pending.locationKind=="unavailable")stringResource(R.string.approval_unknown_location) else if(pending.locationKind=="device-region")stringResource(R.string.approval_device_region,pending.locationLabel) else pending.locationLabel
                    Text(stringResource(R.string.approval_location,location),style=MaterialTheme.typography.bodySmall)
                    if(pending.accountEmail.isNotBlank())Text(pending.accountEmail,style=MaterialTheme.typography.bodySmall)
                }
            }
            if(choosing){
                Text(stringResource(R.string.approval_instruction))
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){
                    pending.candidateCodes.shuffled(remember(pending.id){kotlin.random.Random(pending.id.hashCode())}).forEach { code ->
                        if(selected==code)Button(onClick={selected=code},enabled=!responding,modifier=Modifier.weight(1f).height(64.dp),contentPadding=PaddingValues(0.dp)){Text(code,fontSize=28.sp,fontFamily=FontFamily.Monospace)}
                        else OutlinedButton(onClick={selected=code;error=null},enabled=!responding,modifier=Modifier.weight(1f).height(64.dp),contentPadding=PaddingValues(0.dp)){Text(code,fontSize=28.sp,fontFamily=FontFamily.Monospace)}
                    }
                }
            }
            if(showHelp)Text(stringResource(R.string.approval_help))
            error?.let{Text(it,color=MaterialTheme.colorScheme.error)}
            Text(if(responding)stringResource(R.string.approval_sending) else stringResource(R.string.approval_expires,seconds))
            LinearProgressIndicator(progress={seconds/60f},modifier=Modifier.fillMaxWidth())
        }},
        confirmButton={Column(Modifier.fillMaxWidth()){
            Button(onClick={if(!choosing)choosing=true else selected?.let(::approve)},enabled=!responding && seconds>0 && (!choosing || selected!=null),modifier=Modifier.fillMaxWidth()){Text(stringResource(R.string.approval_yes))}
            OutlinedButton(onClick=::deny,enabled=!responding,modifier=Modifier.fillMaxWidth()){Text(stringResource(R.string.approval_no))}
            TextButton(onClick={showHelp=!showHelp},enabled=!responding,modifier=Modifier.fillMaxWidth()){Text(stringResource(R.string.approval_cannot_see))}
        }})
}

'''
# Keep candidate order stable during the countdown; the correct position is shuffled once per request.
head=head.replace('    var showHelp by remember { mutableStateOf(false) }','    var showHelp by remember { mutableStateOf(false) }\n    val candidates=remember(pending.id){pending.candidateCodes.shuffled()}')
head=head.replace('pending.candidateCodes.shuffled(remember(pending.id){kotlin.random.Random(pending.id.hashCode())}).forEach','candidates.forEach')
p.write_text(head+tail,encoding='utf-8')
