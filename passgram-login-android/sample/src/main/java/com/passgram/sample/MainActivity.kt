package com.passgram.sample

import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.passgram.login.PassGramLoginButton

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "PassGram Login SDK Sample",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        PassGramLoginButton(
                            botUsername = "DemoAuthBot",
                            onAuthSuccess = { user ->
                                Log.d("PassGramSample", "Success: ${user.fullName} (@${user.username})")
                                Toast.makeText(
                                    this@MainActivity,
                                    "Welcome ${user.fullName}!",
                                    Toast.LENGTH_LONG
                                ).show()
                            },
                            onAuthError = { error ->
                                Log.e("PassGramSample", "Error: $error")
                            }
                        )
                    }
                }
            }
        }
    }
}
