const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

function getDependency(dirname) {
    return express.static(path.join(__dirname, '..', dirname));
}

app.use('/assets', getDependency('assets'));
app.use('/node_modules', getDependency('node_modules'));
app.use('/', getDependency('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server in esecuzione su http://localhost:${port}`);
});
