import os
import re
from fpdf import FPDF

class StudyPDF(FPDF):
    def header(self):
        try:
            self.set_font("Arial", 'B', 10)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, "CRAWLED BY Datto-sama", 0, 1, 'R')
            self.ln(2)
        except:
            pass

def create_study_pdf(text_file, img_folder, output_pdf):
    try:
        with open(text_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: {text_file} not found.")
        return

    pattern = r"Slide (\d+) - Answer:\n(.*?)(?=\n-+\n|Slide \d+ - Answer:|$)"
    matches = re.findall(pattern, content, re.DOTALL)
    
    pdf = StudyPDF()
    pdf.set_margins(10, 10, 10)
    pdf.set_auto_page_break(True, margin=15)
    
    font_path = r"C:\Windows\Fonts\Arial.ttf" 
    font_bold_path = r"C:\Windows\Fonts\Arialbd.ttf"
    
    if os.path.exists(font_path):
        pdf.add_font("Arial", "", font_path)
        pdf.add_font("Arial", "B", font_bold_path)
        pdf.set_font("Arial", size=10)
    else:
        pdf.set_font("Helvetica", size=10)

    print(f"Found {len(matches)} slides. Generating PDF (1 slide per page)...")

    for slide_num, answer_text in matches:
        pdf.add_page()
        
        slide_num_padded = slide_num.strip().zfill(3)
        img_name = f"slide_{slide_num_padded}.png"
        img_path = os.path.join(img_folder, img_name)

        pdf.set_font("Arial", 'B', 14)
        pdf.cell(0, 10, f"Slide {slide_num}", ln=True)
        pdf.ln(2)

        if os.path.exists(img_path):
            pdf.image(img_path, x=12.5, y=pdf.get_y(), w=185)
            pdf.set_y(pdf.get_y() + 110)
        else:
            pdf.set_text_color(255, 0, 0)
            pdf.cell(0, 10, f"[Missing Image: {img_name}]", ln=True)
            pdf.set_text_color(0, 0, 0)

        # add Answer/Note
        pdf.ln(5)
        pdf.set_font("Arial", 'B', 11)
        pdf.cell(0, 8, "Answer / Note:", ln=True)
        
        pdf.set_font("Arial", '', 11)
        clean_answer = answer_text.strip()
        pdf.multi_cell(0, 6, clean_answer)
        
    pdf.output(output_pdf)
    print(f"Success! PDF saved as: {output_pdf}")

if __name__ == "__main__":
    create_study_pdf("Answers.txt", "img", "SWE202c.pdf")