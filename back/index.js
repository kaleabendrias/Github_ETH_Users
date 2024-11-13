require('dotenv').config()
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
app.use(cors())
const cache = new NodeCache({ stdTTL: 3600 });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

app.get('/developers', async (req, res) => {
  try {
    const cached = cache.get('developers');
    if (cached) return res.json(cached);

    // Fetch total count first
    const initialResponse = await axios.get('https://api.github.com/search/users', {
      params: {
        q: 'location:ethiopia',
        sort: 'followers',
        order: 'desc',
        per_page: 1
      },
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const totalCount = Math.min(initialResponse.data.total_count, 1000);
    const perPage = 100;
    const pages = Math.ceil(totalCount / perPage);
    let allDevelopers = [];

    for (let page = 1; page <= pages; page++) {
      const { data } = await axios.get('https://api.github.com/search/users', {
        params: {
          q: 'location:ethiopia',
          sort: 'followers',
          order: 'desc',
          per_page: perPage,
          page: page
        },
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });


      const developers = data.items.map(user => ({
        username: user.login,
        avatar: user.avatar_url,
        profile: user.html_url,
        repos_url: user.repos_url,
        followers: user.followers || 0
      }));

      allDevelopers = [...allDevelopers, ...developers];

      if (page < pages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    cache.set('developers', allDevelopers);
    res.json(allDevelopers);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch developers',
      message: error.message 
    });
  }
});

app.get('/most_used', (req, res) => {
  res.status(200).json({message: 'most used language'})
})

app.listen(3000, () => console.log('Server running on port 3000'));