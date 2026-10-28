"""Read-only device view available solely in the configured admin's private chat."""
import asyncio
from pyrogram.enums import ParseMode

def clean(value, limit=500):
    text = str(value if value is not None else '—')
    return ''.join(c for c in text if c >= ' ' and c not in '\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069')[:limit]

def describe(device):
    context = device.get('deviceContext') or {}
    lines = [f"Device: {clean(device.get('deviceId'), 80)}",
             f"Sharing: {'ON' if device.get('contextSharingEnabled') else 'OFF'}"]
    if not context or not device.get('contextSharingEnabled'):
        return '\n'.join(lines + ['No shared live device context.'])
    for label,key in [('Phone','deviceModel'),('Manufacturer','manufacturer'),('Android','androidVersion'),
                      ('App','appVersion'),('Language','language'),('Time zone','timeZone'),
                      ('Country','countryCode'),('City','city'),('Address','address'),('IP','ipAddress'),
                      ('Phone number (provided)','phoneNumber'),('Source','locationSource'),
                      ('Latitude','latitude'),('Longitude','longitude'),('Accuracy (metres)','accuracyMeters'),('Last update','updatedAt')]:
        if context.get(key) not in (None, ''): lines.append(f'{label}: {clean(context[key])}')
    return '\n'.join(lines)

def install(g):
    @g['app'].on_message(g['filters'].command('devices') & g['filters'].private & g['filters'].user(g['ADMIN_ID']))
    async def devices(client, message):
        if not g.get('firestore_db'):
            return await message.reply_text('Firebase Admin is not connected.', parse_mode=ParseMode.DISABLED)
        if len(message.command) != 2:
            return await message.reply_text('/devices ZP-ID|email', parse_mode=ParseMode.DISABLED)
        try:
            uid, _ = await asyncio.to_thread(g['find_subscription_by_id_or_email'], message.command[1])
            if not uid:
                return await message.reply_text('Account not found.', parse_mode=ParseMode.DISABLED)
            records = await asyncio.to_thread(lambda: list(g['firestore_db'].collection('users').document(uid)
                                                          .collection('devices').limit(20).stream()))
            if not records:
                return await message.reply_text('No registered devices.', parse_mode=ParseMode.DISABLED)
            for record in records:
                await message.reply_text(describe(record.to_dict() or {}), parse_mode=ParseMode.DISABLED)
        except Exception:
            await message.reply_text('Device details could not be loaded. Please try again.', parse_mode=ParseMode.DISABLED)
