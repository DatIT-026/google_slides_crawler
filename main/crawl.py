import os
import requests

def main():
    base_path = r"C:\Users\datto\Desktop\crawl-src"
    img_folder = os.path.join(base_path, "img")
    cookie_path = os.path.join(base_path, "cookie.txt")
    urls_path = os.path.join(base_path, "urls.txt")

    if not os.path.exists(img_folder):
        os.makedirs(img_folder)

    if not os.path.exists(urls_path):
        print(f"Error: {urls_path} not found. Please create it first.")
        return

    with open(cookie_path, "r", encoding="utf-8") as f:
        cookie_data = f.read().strip()

    with open(urls_path, "r", encoding="utf-8") as f:
        url_list = [line.strip() for line in f if line.strip()]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Cookie": cookie_data,
        "Referer": "https://docs.google.com/presentation/"
    }

    print(f"Total slides found in file: {len(url_list)}")

    for index, url in enumerate(url_list, start=1):
        file_name = f"slide_{index:03d}.png"
        target_path = os.path.join(img_folder, file_name)

        if os.path.exists(target_path):
            print(f"Skipping {file_name}...")
            continue

        try:
            response = requests.get(url, headers=headers, timeout=20)
            if response.status_code == 200:
                with open(target_path, "wb") as f:
                    f.write(response.content)
                print(f"Downloaded: {file_name}")
            else:
                print(f"Failed: {file_name} | Status: {response.status_code}")
                # If 403 occurs here, the HMAC in the URLs in urls.txt might have expired.
                # You need to refresh the page and re-run Step 1.
        except Exception as e:
            print(f"Error at {file_name}: {e}")

if __name__ == "__main__":
    main()