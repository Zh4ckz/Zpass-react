package com.zpass

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource

@Composable
fun DeviceLocationSettings() {
    val context = LocalContext.current
    val status by DeviceContextTracker.state.collectAsState()
    var confirm by remember { mutableStateOf(false) }
    val permissions = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true || result[Manifest.permission.ACCESS_COARSE_LOCATION] == true)
            DeviceContextTracker.setEnabled(context, true)
    }
    ProfileActionButton(Icons.Default.LocationOn,
        stringResource(if (status.enabled || DeviceContextTracker.isEnabled(context)) R.string.device_location_stop else R.string.device_location_start)) {
        if (DeviceContextTracker.isEnabled(context)) DeviceContextTracker.setEnabled(context, false) else confirm = true
    }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false },
        title = { Text(stringResource(R.string.device_location_start)) },
        text = { Text(stringResource(R.string.device_location_consent)) },
        confirmButton = { TextButton(onClick = {
            confirm = false
            permissions.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }) { Text(stringResource(R.string.device_location_allow)) } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text(stringResource(R.string.cancel)) } })
}
