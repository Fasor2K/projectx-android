"""Schema leggibile di artboard .dc.html del canvas di design: testi visibili, nomi dei livelli
(data-name) con posizione, colori di sfondo e link dei prototipi. Salta status bar e SVG.

Uso: python3 -I outline.py <file.dc.html>... [--text]   (--text: solo testi e link)
"""
import re
import sys
from html.parser import HTMLParser

SKIP = ('svg', 'style', 'script', 'helmet', 'head')
VOID = ('meta', 'link', 'img', 'input', 'br')
NOISE = re.compile(r'Status bar|Dynamic Island|Levels|Cellular|Wifi|Battery|"9:41"|Home Indicator|Fill \+ Shadow|Glass Effect')


class Outline(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth, self.skip, self.lines = 0, 0, []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        pad = '  ' * self.depth
        if tag == 'img':
            self.lines.append(f'{pad}[img {a.get("data-name") or ""}]')
        if tag in VOID:
            return
        if tag in SKIP:
            self.skip += 1
            if tag == 'svg' and self.skip == 1:
                self.lines.append(f'{pad}[svg {a.get("data-name") or a.get("aria-label") or ""}]')
        elif not self.skip:
            name = a.get('data-name')
            style = a.get('style', '')
            pos = re.search(r'left: ([\d.-]+)px; top: ([\d.-]+)px; width: ([\d.]+)px; height: ([\d.]+)px', style)
            bg = re.search(r'background(?:-color)?: ([^;]+)', style)
            line = f'{pad}<{tag}> {name or ""}'
            if pos:
                line += f' @{pos[1]},{pos[2]} {pos[3]}x{pos[4]}'
            if tag == 'a':
                line += f' HREF={a.get("href", "")} {a.get("aria-label") or ""}'
            if bg and 'gradient' not in bg[1]:
                line += f' bg={bg[1][:40]}'
            if name or tag == 'a':
                self.lines.append(line)
        self.depth += 1

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        self.depth -= 1
        if tag in SKIP:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.lines.append('  ' * self.depth + f'"{data.strip()}"')


text_only = '--text' in sys.argv
for path in (p for p in sys.argv[1:] if p != '--text'):
    parser = Outline()
    with open(path, encoding='utf-8') as f:
        parser.feed(f.read())
    print('=====', path)
    for line in parser.lines:
        if NOISE.search(line):
            continue
        if text_only and '"' not in line and 'HREF' not in line:
            continue
        print(line)
