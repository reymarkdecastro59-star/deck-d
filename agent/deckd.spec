# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('ui/app.html', 'ui')]
binaries = []
hiddenimports = ['pystray._win32', 'PIL._tkinter_finder', 'boto3', 'botocore',
                 'win32event', 'win32api', 'winerror', 'clr']
# botocore data files (token refresh), pywebview + its .NET bridge for the
# WebView2 companion window.
for pkg in ('botocore', 'webview', 'pythonnet', 'clr_loader'):
    tmp_ret = collect_all(pkg)
    datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='deckd',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/deckd.ico',
)
