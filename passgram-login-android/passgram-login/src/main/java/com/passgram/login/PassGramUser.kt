package com.passgram.login

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

/**
 * Represents an authenticated PassGram user payload returned to 3rd-party Android apps.
 */
@Parcelize
data class PassGramUser(
    val uid: String,
    val fullName: String,
    val username: String,
    val photoUrl: String? = null,
    val authDate: Long = System.currentTimeMillis() / 1000L,
    val hash: String = ""
) : Parcelable
