#!/bin/bash

pandoc resume.md \
  -o resume.pdf \
  -c resume.css \
  --pdf-engine=wkhtmltopdf \
  --variable margin-top=0.7in \
  --variable margin-right=0.7in \
  --variable margin-bottom=0.7in \
  --variable margin-left=1in

pandoc resume-product.md \
  -o resume-product.pdf \
  -c resume.css \
  --pdf-engine=wkhtmltopdf \
  --variable margin-top=0.7in \
  --variable margin-right=0.7in \
  --variable margin-bottom=0.7in \
  --variable margin-left=1in
  
pandoc resume.md \
  -o resume.html \
  -c resume.css \
  --standalone

