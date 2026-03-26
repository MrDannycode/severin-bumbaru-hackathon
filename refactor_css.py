import os
import re

html_files = {
    'index.html': 'css/style.css',
    'admin.html': 'css/admin.css',
    'sysadmin.html': 'css/sysadmin.css',
    'adauga.html': 'css/adauga.css'
}

base_dir = r"e:\severin-bumbaru-hackathon"

# Ensure css dir exists
os.makedirs(os.path.join(base_dir, 'css'), exist_ok=True)

for html_file, css_file in html_files.items():
    html_path = os.path.join(base_dir, html_file)
    css_path = os.path.join(base_dir, css_file)
    
    if not os.path.exists(html_path):
        continue
        
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find the style block
    style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
    if style_match:
        css_content = style_match.group(1).strip() + '\n'
        
        # Write to CSS file
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_content)
            
        print(f"Extracted {len(css_content)} bytes to {css_file}")
        
        # Check if the link tag already exists
        link_tag = f'<link rel="stylesheet" href="{css_file}">'
        if link_tag in content or f'href="{css_file}"' in content:
            # It's already linked, so just remove the style block
            replacement = ''
        else:
            # Replace style block with link tag
            replacement = link_tag
            
        new_content = content[:style_match.start()] + replacement + content[style_match.end():]
        
        # Clean up possible double blank lines left by removal
        new_content = re.sub(r'\n\s*\n\s*\n', '\n\n', new_content)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
        print(f"Updated {html_file}")
    else:
        print(f"No <style> block found in {html_file}")

