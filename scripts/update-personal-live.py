from pathlib import Path
p=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass\PersonalInfoDialog.kt');s=p.read_text();needle='    AlertDialog(\n        onDismissRequest = onDismiss,';s=s.replace(needle,'''    LaunchedEffect(saved) {
        val value = saved
        if (loaded && !editing && value != null) {
            fun decrypt(raw: String) = runCatching { Security.decrypt(raw) }.getOrDefault("")
            draft = PersonalDraft(decrypt(value.encryptedFirstName), decrypt(value.encryptedLastName),
                decrypt(value.encryptedEmail), decrypt(value.encryptedPhone), decrypt(value.encryptedCompany),
                decrypt(value.encryptedAddressLine1), decrypt(value.encryptedAddressLine2), decrypt(value.encryptedCity),
                decrypt(value.encryptedState), decrypt(value.encryptedPostalCode), decrypt(value.encryptedCountry))
            loadedSaved = value
        }
    }

'''+needle);p.write_text(s)
