from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
dist.mkdir(exist_ok=True)
manifest = json.loads((root / 'extension/manifest.json').read_text())
out = dist / f"taplet-{manifest['version']}-unsigned.xpi"


def add_file(archive, name, data):
    info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    archive.writestr(info, data)


with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for file in sorted((root / 'extension').iterdir()):
        if file.is_file() and not file.name.startswith('.'):
            add_file(z, file.name, file.read_bytes())
    add_file(z, 'LICENSE', (root / 'LICENSE').read_bytes())
source = dist / f"taplet-{manifest['version']}-source.zip"
with zipfile.ZipFile(source, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'README.md', 'PRIVACY.md', 'CONTRIBUTING.md', 'LICENSE', 'build.sh', 'src/lib.rs', 'scripts/package.py', 'tests/core.test.cjs', 'docs/TESTING.md', 'docs/studio.png']:
        add_file(z, name, (root / name).read_bytes())
    for file in sorted((root / 'extension').iterdir()):
        if file.is_file() and not file.name.startswith('.') and file.suffix != '.wasm':
            add_file(z, 'extension/' + file.name, file.read_bytes())
checksums = dist / 'SHA256SUMS.txt'
checksums.write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in [out, source]))
print(f'Built {out.name}: {out.stat().st_size:,} bytes; Rust WASM: {(root / "extension/core.wasm").stat().st_size:,} bytes')
