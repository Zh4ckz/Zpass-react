# PassGram Login SDK for Android

[PassGram](https://zpas.org) Login SDK allows Android developers to easily integrate "Log in with PassGram" into their applications.

Matches [Telegram Login for Android](https://github.com/TelegramMessenger/telegram-login-android) specifications.

---

## 📦 Installation

Add JitPack repository to your `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}
```

Add the library dependency to your app `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.github.Zh4ckz:passgram-login-android:1.0.0")
}
```

---

## 🚀 Usage

### Jetpack Compose Example

```kotlin
import com.passgram.login.PassGramLoginButton

@Composable
fun LoginScreen() {
    PassGramLoginButton(
        botUsername = "YourAppBot",
        onAuthSuccess = { user ->
            Log.d("PassGramLogin", "User logged in: ${user.fullName} (@${user.username})")
        },
        onAuthError = { error ->
            Log.e("PassGramLogin", "Auth error: $error")
        }
    )
}
```

### Android View Example (XML)

```xml
<com.passgram.login.PassGramLoginView
    android:id="@+id/btnPassgramLogin"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:botUsername="YourAppBot"
    app:buttonStyle="blue" />
```

---

## 🔒 User Model Specification

When authentication completes, `onAuthSuccess` receives a `PassGramUser` object:

```kotlin
data class PassGramUser(
    val uid: String,
    val fullName: String,
    val username: String,
    val photoUrl: String?,
    val authDate: Long,
    val hash: String
)
```

---

## 📄 License

PassGram Login SDK is available under the [Apache 2.0 License](LICENSE).
