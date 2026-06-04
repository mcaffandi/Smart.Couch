const content = `<p><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."></p>`;
const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
console.log(match ? "Matched: " + match[1].substring(0, 30) : "No match");
