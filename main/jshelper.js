// paste this script into the Dev Tools
// then copy the result and paste into the urls.txt
const slides = document.querySelectorAll('section.slide-content');
const urls = Array.from(slides).map(s => {
    let url = s.style.backgroundImage.slice(5, -2);
    return url.replace(/&showText=0/g, '&showText=1');
});
console.log(urls.join('\n'));

// use this script to get the Answers
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
    // auto download file Answers.txt
    const blob = new Blob([output], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Answers.txt';
    a.click();
})();