package com.passgram.login

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.AttributeSet
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Jetpack Compose "Log in with PassGram" Widget Button.
 */
@Composable
fun PassGramLoginButton(
    botUsername: String,
    modifier: Modifier = Modifier,
    buttonStyle: String = "blue",
    onAuthSuccess: (PassGramUser) -> Unit,
    onAuthError: (String) -> Unit = {}
) {
    val context = LocalContext.current

    val bg = when (buttonStyle) {
        "dark" -> Color(0xFF1C2733)
        "outlined" -> Color.Transparent
        else -> Color(0xFF3390EC)
    }

    val textColor = when (buttonStyle) {
        "outlined" -> Color(0xFF3390EC)
        else -> Color.White
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(22.dp))
            .background(bg)
            .clickable {
                try {
                    val authUri = Uri.parse("https://zpas.org/setlanguage/en?bot=$botUsername")
                    val intent = Intent(Intent.ACTION_VIEW, authUri)
                    context.startActivity(intent)
                } catch (e: Exception) {
                    onAuthError(e.message ?: "Failed to open PassGram login")
                }
            }
            .padding(horizontal = 24.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(Color.White.copy(alpha = 0.25f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Z",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
            Text(
                text = "Log in with PassGram",
                color = textColor,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}

/**
 * Android View-compatible widget wrapper for XML layouts.
 */
class PassGramLoginView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private var botUsername: String = "ZPassBot"

    init {
        val composeView = ComposeView(context).apply {
            setContent {
                PassGramLoginButton(
                    botUsername = botUsername,
                    onAuthSuccess = {}
                )
            }
        }
        addView(composeView)
    }

    fun setBotUsername(username: String) {
        this.botUsername = username
    }
}
