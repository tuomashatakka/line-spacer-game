import fs from 'fs';
fetch('https://github.com/tuomashatakka/threejs-scenes-skill/archive/refs/heads/main.zip').then(r=>r.arrayBuffer()).then(b=>{
    fs.writeFileSync('skill.zip', Buffer.from(b))
    console.log("Wrote skill.zip, size:", b.byteLength)
}).catch(console.error)
