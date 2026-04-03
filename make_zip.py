import zipfile
import os
import sys

dist_dir = r"c:\Users\suppl\Desktop\donnatokiimo_map\dist"
zip_path = r"c:\Users\suppl\Desktop\donnatokiimo_map\deploy_fs.zip"

if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for dirpath, dirnames, filenames in os.walk(dist_dir):
        for filename in filenames:
            full_path = os.path.join(dirpath, filename)
            # entry name relative to dist, with forward slashes
            entry_name = os.path.relpath(full_path, dist_dir).replace('\\', '/')
            zf.write(full_path, entry_name)
            print(f"  added: {entry_name}")

print(f"\nCreated {zip_path}")
