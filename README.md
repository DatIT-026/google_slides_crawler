# Google Slide Crawler

A lightweight tool designed to extract high-quality slide images and notes from Google Slides, automatically compiling them into a structured PDF.

## How to use?

### 📋 Prerequisites

Before you begin, ensure you have Python installed and the necessary libraries:
```
pip install requests fpdf2
```

Clone this repo:
```
https://github.com/DatIT-026/google_slide_crawler.git
cd google_slide_crawler
```

### Step 1: Prepare the Google Slide URL

Open your Google Slide and modify the URL ending. Change the suffix (usually /edit...) to `/htmlpresent`.

For example:
- **Original**: `https://docs.google.com/presentation/d/1abc.../edit`
- **Modified**: `https://docs.google.com/presentation/d/1abc.../htmlpresent`

### Step 2: Extract Data via Browser Console

Open the Modified URL in your browser, press F12 (or Ctrl+Shift+I) to open `Dev Tools`, and go to the `Console` tab.

#### A. Get Slide URLs

Paste the following code to extract image links. Copy the resulting list and save it into a file named `urls.txt` in the project folder.

```javascript
const slides = document.querySelectorAll('section.slide-content');
const urls = Array.from(slides).map(s => {
    let url = s.style.backgroundImage.slice(5, -2);
    return url.replace(/&showText=0/g, '&showText=1');
});
console.log(urls.join('\n'));
```

#### B. Get Answers

Paste this code to extract notes. This will automatically trigger a download for Answers.txt. Move this file into the project folder.

```javascript
(function() {
    const slides = document.querySelectorAll('div.slide');
    let output = "";

    slides.forEach(slide => {
        const slideNum = slide.querySelector('h1.offscreen-header')?.innerText.split(' ')[0] || "Unknown";
        const notes = slide.querySelectorAll('aside.slide-notes p');
        let noteText = Array.from(notes)
            .map(p => p.innerText.trim())
            .filter(text => text.length > 0)
            .join('\n');

        output += `Slide ${slideNum} - Answer:\n${noteText}\n--------------------\n\n`;
    });

    console.log(output);
    const blob = new Blob([output], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Answers.txt';
    a.click();
})();
```

### Step 3: Authenticate (Session Cookies)

To allow the script to download the images, you need your session cookie:

- In Dev Tools, go to the `Network` tab.
- Reload the page (F5).
- Click on any request named `viewpage?pageid=...`.
- Under `Headers` > `Request Headers`, find the `Cookie:` field.
- Copy the entire string and paste it into a file named `cookie.txt`.

### Step 4: Run the Crawler

#### A. Download Images

Execute the Python scripts in order:

```python
python crawl.py
```
_Wait for the download process to complete._

#### B. Generate PDF

```python
python helper.py
```
_Once finished, your compiled PDF will appear in the project directory._

## Note & Disclaimer
For educational and research purposes only. Use this tool responsibly. The developer is not responsible for any misuse or illegal activities conducted with this tool.

This project is licensed under the [MIT License](LICENSE).
