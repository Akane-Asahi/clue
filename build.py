#!/usr/bin/env python3
"""Build one self-contained index.html: inlines portraits.js and solver.js. Usage: python3 build.py [out.html]"""
import sys, os
here = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'dist', 'index.html')
s = open(os.path.join(here, 'index.html')).read()
for f in ('portraits.js', 'solver.js'):
    tag = '<script src="%s"></script>' % f
    assert tag in s, tag
    s = s.replace(tag, '<script>\n' + open(os.path.join(here, f)).read() + '\n</script>')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w').write(s)
print('built', out, len(s), 'bytes')
