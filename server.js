import express from 'express';
import bodyParser from 'body-parser';
import translate from 'node-google-translate-skidz';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/departments', async (req, res) => {
    try {
        const response = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments');
        const data = await response.json();
        res.json(data.departments);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching departments' });
    }
});

app.get('/search', async (req, res) => {
    const { department, keyword, location } = req.query;
    let apiUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(keyword || 'flowers')}`;
    
    if (department) {
        apiUrl += `&departmentId=${department}`;
    }
    
    if (location) {
        apiUrl += `&geoLocation=${encodeURIComponent(location)}`;
    }
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching object IDs' });
    }
});

app.get('/object/:id', async (req, res) => {
    const { lang } = req.query;
    try {
        const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${req.params.id}`);
        const data = await response.json();
        
        const translatedTitle = lang ? await translateText(data.title, lang) : data.title;
        const translatedCulture = lang ? await translateText(data.culture, lang) : data.culture;
        const translatedDynasty = lang ? await translateText(data.dynasty, lang) : data.dynasty;
        const translatedArtist = lang ? await translateText(data.artistDisplayName, lang) : data.artistDisplayName; 
        const translatedObjectType = lang ? await translateText(data.objectType, lang) : data.objectType; 

        res.json({
            ...data,
            title: translatedTitle,
            culture: translatedCulture,
            dynasty: translatedDynasty,
            artistDisplayName: translatedArtist,
            objectType: translatedObjectType,
            medium: translatedMedium
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching object data' });
    }
});

const translateText = async (text, targetLang) => {
    if (!text || !targetLang) return text;
    return new Promise((resolve, reject) => {
        translate(text, { to: targetLang }, (result) => {
            if (result.error) {
                reject(result.error);
            } else {
                resolve(result.translatedText);
            }
        });
    });
};

app.post('/translate', (req, res) => {
    const { text, targetLang } = req.body;

    translate(text, targetLang, (result) => {
        if (result.error) {
            res.status(500).json({ error: result.error });
        } else {
            res.json({ translatedText: result.translatedText });
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
