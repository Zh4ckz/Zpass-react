"""Fill public UI catalogs, wire literal Compose text, and audit placeholders.

Only public interface text is sent to the translation service. No account,
credential, vault, or configuration files are read by this script.
"""
import concurrent.futures, hashlib, json, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

WEB = Path(__file__).resolve().parents[1] / 'public'
ANDROID = Path('C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main')
DESKTOP = Path('C:/Users/rezan/source/repos/ZPassManager/ZPassManager')
CACHE = Path(__file__).with_name('ui-translation-cache.json')
cache = json.loads(CACHE.read_text('utf-8')) if CACHE.exists() else {}
offline = '--offline' in sys.argv
catalog_path = WEB / 'resources/assets/lang/json'
catalogs = {p.stem: json.loads(p.read_text('utf-8-sig')) for p in catalog_path.glob('*.json')}
english = catalogs['en-US']

def public_text(s):
    return len(s) > 1 and bool(re.search('[A-Za-z]', s)) and not any(x in s for x in ('http', '${', '\\n', '$', '://')) and len(s) < 1000

base = {}
for p in (ANDROID / 'res/values').glob('*.xml'):
    for e in ET.parse(p).getroot().findall('string'):
        if len(e) == 0:
            base[e.attrib['name']] = (e.text or '').replace("\\'", "'").replace('\\"', '"')
by_text = {v: k for k, v in base.items()}
new = {}
previous_extra = ANDROID / 'res/values/ui_complete.xml'
if previous_extra.exists():
    new = {e.attrib['name']: (e.text or '').replace("\\'", "'").replace('\\"', '"') for e in ET.parse(previous_extra).getroot().findall('string')}
count = 0
pattern = re.compile(r'\bText\(\s*(?:text\s*=\s*)?"([^"\\\n]*)"')
for p in (ANDROID / 'java/com/zpass').rglob('*.kt'):
    source = p.read_text('utf-8')
    if p.name == 'ProfileScreen.kt':
        source = source.replace('The Linebeck Discord palette is used across Z Pass on web, Windows, and Android.', 'Z Pass uses a blue accent theme across web, Windows and Android.').replace('Discord · Linebeck', 'Z Pass Blue').replace('Appearance  •  Discord', 'Appearance')
    def wire(m):
        global count
        value = m.group(1)
        if not public_text(value) or value in ('Z Pass', 'Google', 'GitHub', 'Google Pay', 'SHA1', 'SHA256', 'SHA512', 'BASE32'):
            return m.group(0)
        key = by_text.get(value) or 'ui_' + hashlib.sha1(value.encode()).hexdigest()[:12]
        if key not in base:
            new[key] = value
        count += 1
        return m.group(0)[:-len(value)-2] + 'stringResource(com.zpass.R.string.' + key + ')'
    changed = pattern.sub(wire, source)
    if changed != p.read_text('utf-8'):
        if 'stringResource(' in changed and 'import androidx.compose.ui.res.stringResource' not in changed:
            changed = changed.replace('\n', '\nimport androidx.compose.ui.res.stringResource\n', 1)
        p.write_text(changed, 'utf-8')
base.update(new)

def write_xml(path, values):
    root = ET.Element('resources')
    for k, v in sorted(values.items()):
        e = ET.SubElement(root, 'string', name=k)
        e.text = v.replace("'", "\\'").replace('"', '\\"')
    ET.indent(root, space='    ')
    path.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(root).write(path, encoding='utf-8', xml_declaration=True)
write_xml(ANDROID / 'res/values/ui_complete.xml', new)

# Include all desktop localization calls and static public HTML text/attributes.
for p in DESKTOP.rglob('*.cs'):
    if any(x in p.parts for x in ('obj', 'bin', 'verification')):
        continue
    for s in re.findall(r'LocalizationService\.(?:Get|Format)\("([^"\\]+)"', p.read_text('utf-8-sig')):
        english.setdefault(s, s)
from html.parser import HTMLParser
class PublicHTML(HTMLParser):
    def __init__(self):
        super().__init__(); self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        for k, v in attrs:
            if k in ('placeholder', 'title', 'aria-label') and v and public_text(v):
                english.setdefault(v, v)
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
    def handle_data(self, data):
        s = ' '.join(data.split())
        if not self.skip and public_text(s):
            english.setdefault(s, s)
for p in WEB.glob('*.html'):
    PublicHTML().feed(p.read_text('utf-8-sig'))

tokens = re.compile(r'%\d+\$[sdif]|%[sdif]|\{[^{}]+\}')
def translate_many(lang, strings):
    result = {}
    pending = []
    for s in strings:
        key = lang + '\n' + s
        if key in cache:
            result[s] = cache[key]
        else:
            pending.append(s)
    if offline:
        return result
    batches, batch, size = [], [], 0
    for s in pending:
        if size + len(s) > 2200 and batch:
            batches.append(batch); batch = []; size = 0
        batch.append(s); size += len(s) + 12
    if batch: batches.append(batch)
    for batch in batches:
        placeholders = {}
        def protect(m):
            key = 'ZPH' + str(len(placeholders)) + 'ZZ'
            placeholders[key] = m.group(0)
            return key
        text = '\n'.join('[%04d] %s' % (i, tokens.sub(protect, s)) for i, s in enumerate(batch))
        url = 'https://translate.googleapis.com/translate_a/single?' + urllib.parse.urlencode(dict(client='gtx', sl='en', tl=lang, dt='t', q=text))
        for attempt in range(4):
            try:
                with urllib.request.urlopen(url, timeout=25) as response:
                    payload = json.load(response)
                translated = ''.join(x[0] for x in payload[0] if x[0])
                translated = translated.translate(str.maketrans({'【':'[','】':']','［':'[','］':']','（':'[','）':']'}))
                pieces = dict((int(i), value.strip()) for i, value in re.findall(r'\[\s*(\d{1,4})\s*\]\s*(.*?)(?=\[\s*\d{1,4}\s*\]|\Z)', translated, re.S))
                if len(pieces) != len(batch):
                    if len(batch) == 1:
                        pieces = {0: re.sub(r'^\[\s*\d+\s*\]\s*', '', translated).strip()}
                    else:
                        midpoint = len(batch) // 2
                        result.update(translate_many(lang, batch[:midpoint]))
                        result.update(translate_many(lang, batch[midpoint:]))
                        break
                for i, s in enumerate(batch):
                    value = re.sub(r'ZPH\s*(\d+)\s*ZZ', lambda m: 'ZPH' + m.group(1) + 'ZZ', pieces[i])
                    if not value.strip():
                        articles = {'ja': {'The': '該当の', 'Open the': '次を開く：'}, 'tr': {'The': 'İlgili'}, 'ko': {'The': '해당', 'Open the': '다음을 여세요：'}}
                        value = articles.get(lang, {}).get(s, '')
                        if not value: raise ValueError('Empty UI translation')
                    for k, original in placeholders.items(): value = value.replace(k, original)
                    if sorted(tokens.findall(s)) != sorted(tokens.findall(value)):
                        raise ValueError('Placeholder mismatch')
                    result[s] = value; cache[lang + '\n' + s] = value
                break
            except urllib.error.HTTPError as error:
                if error.code == 429: raise RuntimeError('Translation service rate limit; cached work preserved') from error
                if attempt == 3: raise
                time.sleep(1 + attempt)
            except Exception:
                if attempt == 3: raise
                time.sleep(1 + attempt)
        print('Translated', lang, len(result), '/', len(strings), flush=True)
    return result

android_locales = ['ar','de','es','fa','fr','hi','id','it','ja','ko','ku','pt','ru','tr','ur','zh']
def locale_work(lang):
    existing = {}
    folder = ANDROID / ('res/values-' + lang)
    for p in folder.glob('*.xml'):
        if p.name == 'ui_complete.xml': continue
        for e in ET.parse(p).getroot().findall('string'): existing[e.attrib['name']] = e.text or ''
    code = next((c for c in catalogs if c.split('-')[0] == lang), None)
    catalog = catalogs.get(code, {})
    missing = {k: v for k, v in base.items() if k not in existing}
    reusable = {s: catalog[s] for s in missing.values() if s in catalog}
    needed = set(missing.values()) - reusable.keys()
    if code: needed.update(k for k in english if not k.startswith('$') and k not in catalog)
    translations = translate_many(lang, sorted(needed))
    translations.update(reusable)
    old = folder / 'ui_complete.xml'
    resolved = {e.attrib['name']: (e.text or '').replace("\\'", "'").replace('\\"', '"') for e in ET.parse(old).getroot().findall('string')} if old.exists() else {}
    resolved.update({k: translations[v] for k, v in missing.items() if v in translations})
    write_xml(old, resolved)
    if code:
        for k in english:
            if k not in catalog and k in translations: catalog[k] = translations[k]
        for destination in (catalog_path, DESKTOP / 'resources/assets/lang/json'):
            (destination / (code + '.json')).write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print('LANGUAGE', lang, 'unresolved Android keys:', sum(k not in resolved for k in missing), flush=True)

print('Wired Android text:', count, 'new keys:', len(new), 'web/desktop keys:', len(english), flush=True)
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        list(pool.map(locale_work, android_locales))
finally:
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), 'utf-8')
    common = set(english)
    pending_by_language = {}
    for code, catalog in catalogs.items():
        if code == 'en-US': continue
        pending_by_language[code] = sorted(set(english) - set(catalog))
        common.intersection_update(catalog)
    # Desktop startup requires all declared English keys in every language.
    # Keep additions that are unfinished in a separate, explicit pending report.
    # Do not publish an English catalog that makes the installed app fail to start.
    Path(__file__).with_name('pending-ui-translations.json').write_text(json.dumps(pending_by_language, ensure_ascii=False, indent=2), 'utf-8')
    Path(__file__).with_name('ui-source-catalog.json').write_text(json.dumps(english, ensure_ascii=False, indent=2), 'utf-8')
    release_english = {k:v for k,v in english.items() if k in common}
    for destination in (catalog_path, DESKTOP / 'resources/assets/lang/json'):
        (destination / 'en-US.json').write_text(json.dumps(release_english, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print('Available translations saved. Run the coverage audit before claiming completeness.', flush=True)
