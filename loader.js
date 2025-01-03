export default function myImageLoader({ src, width, quality }) {
    if (src.startsWith('http')) {
        return src
    }
    return `http://localhost:3000/api/images/${src}?w=${width}&q=${quality || 75}`
}

//this for serve images from router images