"""Wire payment labels, formatted UI text and conditional Compose copy."""
from pathlib import Path
import hashlib, re, xml.etree.ElementTree as ET
root = Path('C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main')
extra = root / 'res/values/payment_ui.xml'
values = {e.attrib['name']: e.text or '' for e in ET.parse(extra).getroot()} if extra.exists() else {}
def resource(text, *arguments):
    key = 'pay_ui_' + hashlib.sha1(text.encode()).hexdigest()[:12]
    values[key] = text
    return 'stringResource(com.zpass.R.string.' + key + (', ' + ', '.join(arguments) if arguments else '') + ')'

for p in (root / 'java/com/zpass').rglob('*.kt'):
    s = p.read_text('utf-8')
    # Conditional Text arguments with static branches; never alter identifiers
    # inside conditions, interpolated strings, URLs, or account data.
    pattern = re.compile(r'(\bText\(\s*(?:text\s*=\s*)?if\s*\([^\n]*?\)\s*)"([^"$\\]*)"(\s*else\s*)"([^"$\\]*)"')
    def conditional(m):
        if not all(re.search('[a-zA-Z]{2}', m.group(i)) for i in (2,4)): return m.group(0)
        return m.group(1) + resource(m.group(2)) + m.group(3) + resource(m.group(4))
    changed = pattern.sub(conditional, s)
    if p.name == 'SubscriptionScreen.kt':
        substitutions = {
            'Text("$count saved accounts"': 'Text(' + resource('%1$d saved accounts', 'count') ,
            'label = "Individual"': 'label = ' + resource('Plus'),
            'label = "Family · 5 people"': 'label = ' + resource('Family · 5 people'),
            'title = "Monthly"': 'title = ' + resource('Monthly'),
            'title = "Yearly"': 'title = ' + resource('Yearly'),
            'title = stripeProvider?.label ?: "Card / Stripe"': 'title = ' + resource('Card / Stripe'),
            'title = "Crypto"': 'title = ' + resource('Crypto'),
            '"Pay with crypto (${money(selectedPrice)})"': resource('Pay with crypto (%1$s)', 'money(selectedPrice)'),
            '"Pay with Google Pay (${money(selectedPrice)})"': resource('Pay with Google Pay (%1$s)', 'money(selectedPrice)'),
            '"Continue with Stripe (${money(selectedPrice)})"': resource('Continue with Stripe (%1$s)', 'money(selectedPrice)'),
            'Modifier.fillMaxWidth().height(34.dp)': 'Modifier.fillMaxWidth().heightIn(min = 48.dp)',
            'Modifier.fillMaxWidth().height(52.dp).background': 'Modifier.fillMaxWidth().heightIn(min = 56.dp).background',
            'Text("Sync: $it"': 'Text(' + resource('Sync: %1$s', 'it'),
        }
        for a, b in substitutions.items(): changed = changed.replace(a, b)
        # Consent must wrap at large font scales and in longer languages.
        changed = changed.replace('Text(stringResource(com.zpass.R.string.ui_e9264af3f29f), color', 'Text(stringResource(com.zpass.R.string.ui_e9264af3f29f), modifier = Modifier.weight(1f), color')
    if p.name == 'ProfileScreen.kt':
        changed = changed.replace('label = "Appearance"', 'label = ' + resource('Appearance'))
    if changed != s:
        if 'import androidx.compose.ui.res.stringResource' not in changed:
            changed = changed.replace('\n', '\nimport androidx.compose.ui.res.stringResource\n', 1)
        p.write_text(changed, 'utf-8')
r = ET.Element('resources')
for k,v in sorted(values.items()): ET.SubElement(r, 'string', name=k).text = v.replace("'", "\\'").replace('"','\\"')
ET.indent(r,space='    ')
ET.ElementTree(r).write(extra,encoding='utf-8',xml_declaration=True)
print('Conditional and payment UI resource keys:',len(values))
