from pathlib import Path
root = Path('C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main/java/com/zpass')
p = root / 'SubscriptionScreen.kt'
s = p.read_text('utf-8')
s = s.replace('.fillMaxWidth().height(52.dp).menuAnchor', '.fillMaxWidth().heightIn(min = 72.dp).menuAnchor')
s = s.replace('text = { Text(coin.displayName) }', 'text = { Text(coin.displayName, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }')
s = s.replace('coil.compose.AsyncImage(', 'coil.compose.SubcomposeAsyncImage(')
s = s.replace('model = selectedCoin.iconUrl,', 'model = selectedCoin.iconUrl,\n                                error = { Icon(Icons.Default.CurrencyBitcoin, contentDescription = null) },')
s = s.replace('model = coin.iconUrl,', 'model = coin.iconUrl,\n                                        error = { Icon(Icons.Default.CurrencyBitcoin, contentDescription = null) },')
p.write_text(s, 'utf-8')
p = root / 'ProfileScreen.kt'
s = p.read_text('utf-8').replace('The Linebeck Discord palette is used across Z Pass on web, Windows, and Android.', 'Z Pass uses a blue accent theme across web, Windows and Android.').replace('Discord · Linebeck', 'Z Pass Blue').replace('Appearance  •  Discord', 'Appearance')
p.write_text(s, 'utf-8')
print('Payment selector sizing, icon fallback and profile theme branding updated.')
