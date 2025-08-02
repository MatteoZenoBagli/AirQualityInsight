convert src/assets/pushpin_big.svg -background transparent -transparent white -resize 16x16 public/favicon-16x16.png
convert src/assets/pushpin_big.svg -background transparent -transparent white -resize 32x32 public/favicon-32x32.png
convert src/assets/pushpin_big.svg -background transparent -transparent white -resize 180x180 public/apple-touch-icon.png
convert src/assets/pushpin_big.svg -background transparent -transparent white -resize 192x192 public/android-chrome-192x192.png
convert src/assets/pushpin_big.svg -background transparent -transparent white -resize 512x512 public/android-chrome-512x512.png
convert src/assets/pushpin_big.svg -background transparent -transparent white \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    -delete 0 \
    public/favicon.ico