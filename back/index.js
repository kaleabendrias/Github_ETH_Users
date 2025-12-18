require('dotenv').config()
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
app.use(cors())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Authorization');
  next();
});

const cache = new NodeCache({ stdTTL: 3600 });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const MAX_DEVELOPERS = 100;
const REPO_SAMPLE_LIMIT = 50;
const LANGUAGE_LIMIT = 5;
const REQUEST_DELAY_MS = 150;

const githubHeaders = {
  Accept: 'application/vnd.github.v3+json',
  ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {})
};

if (!GITHUB_TOKEN) {
  console.warn('Warning: GITHUB_TOKEN is not set. GitHub rate limits will be very low.');
}

app.get('/developers', async (req, res) => {
  try {
    const cached = cache.get('developers');
    if (cached) return res.json(cached);

    const initialResponse = await axios.get('https://api.github.com/search/users', {
      params: {
        q: 'location:ethiopia',
        sort: 'followers',
        order: 'desc',
        per_page: 1
      },
      headers: githubHeaders
    });

    const totalCount = Math.min(initialResponse.data.total_count, MAX_DEVELOPERS);
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
        headers: githubHeaders
      });


      const developers = data.items.map(user => ({
        username: user.login,
        avatar: user.avatar_url,
        profile: user.html_url,
        repos_url: user.repos_url,
        followers: user.followers || 0
      }));

      allDevelopers = [...allDevelopers, ...developers];

      if (allDevelopers.length >= MAX_DEVELOPERS) {
        allDevelopers = allDevelopers.slice(0, MAX_DEVELOPERS);
        break;
      }

      if (page < pages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const enrichedDevelopers = [];

    for (const developer of allDevelopers) {
      try {
        const [userRes, reposRes] = await Promise.all([
          axios.get(`https://api.github.com/users/${developer.username}`, {
            headers: githubHeaders
          }),
          axios.get(`https://api.github.com/users/${developer.username}/repos`, {
            params: {
              per_page: REPO_SAMPLE_LIMIT,
              sort: 'pushed',
              direction: 'desc'
            },
            headers: githubHeaders
          })
        ]);

        const repos = reposRes.data.filter(repo => !repo.fork).slice(0, REPO_SAMPLE_LIMIT);
        const languageCounts = repos.reduce((acc, repo) => {
          if (repo.language) {
            acc[repo.language] = (acc[repo.language] || 0) + 1;
          }
          return acc;
        }, {});

        const languages = Object.entries(languageCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name)
          .slice(0, LANGUAGE_LIMIT);

        enrichedDevelopers.push({
          username: developer.username,
          avatar: userRes.data.avatar_url,
          profile: userRes.data.html_url,
          repos_url: developer.repos_url,
          followers: userRes.data.followers,
          languages
        });
      } catch (detailError) {
        console.error(`Failed to enrich ${developer.username}:`, detailError.message);
        enrichedDevelopers.push({
          ...developer,
          languages: []
        });
      }

      if (REQUEST_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
      }
    }

    cache.set('developers', enrichedDevelopers);
    res.json(enrichedDevelopers);

  } catch (error) {
    console.error('whole error: ', error)
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch developers',
      message: error.message 
    });
  }
});

const githubAPI = axios.create({
  headers: {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});

githubAPI.interceptors.response.use(response => {
  const remaining = response.headers['x-ratelimit-remaining'];
  const reset = response.headers['x-ratelimit-reset'];
  if (remaining) {
    console.log(`Rate limit remaining: ${remaining}`);
  }
  return response;
});

app.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const cacheKey = `user-${username}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const rateLimit = await githubAPI.get('https://api.github.com/rate_limit');
    const remaining = rateLimit.data.resources.core.remaining;
    
    if (remaining < 50) {
      const resetTime = new Date(rateLimit.data.resources.core.reset * 1000);
      return res.status(429).json({
        error: 'Rate limit near exceeded',
        message: `Please try again after ${resetTime.toISOString()}`,
        remainingCalls: remaining,
        resetTime: resetTime
      });
    }

    const userRes = await githubAPI.get(`https://api.github.com/users/${username}`);

    const [reposRes, followersRes, orgsRes] = await Promise.all([
      githubAPI.get(`https://api.github.com/users/${username}/repos`, {
        params: {
          per_page: 30,
          sort: 'pushed',
          direction: 'desc'
        }
      }),
      githubAPI.get(`https://api.github.com/users/${username}/followers`, {
        params: { per_page: 30 }
      }),
      githubAPI.get(`https://api.github.com/users/${username}/orgs`)
    ]);

    const repos = reposRes.data.filter(repo => !repo.fork);

    const topRepos = repos.slice(0, 10);
    const languagePromises = topRepos.map(async (repo, index) => {
      await new Promise(resolve => setTimeout(resolve, index * 100));
      return githubAPI.get(repo.languages_url);
    });

    const languages = {};
    const languageResponses = await Promise.all(languagePromises);
    
    languageResponses.forEach(response => {
      const repoLanguages = response.data;
      Object.entries(repoLanguages).forEach(([lang, bytes]) => {
        languages[lang] = (languages[lang] || 0) + bytes;
      });
    });

    const totalContributions = repos.reduce((sum, repo) => {
      return sum + repo.stargazers_count + repo.forks_count;
    }, 0);

    const userData = {
      profile: {
        ...userRes.data,
        followers_preview: followersRes.data.slice(0, 8),
        organizations: orgsRes.data,
      },
      statistics: {
        totalRepos: userRes.data.public_repos,
        totalContributions,
        followerCount: userRes.data.followers,
        followingCount: userRes.data.following,
      },
      languages: Object.entries(languages)
        .map(([name, bytes]) => ({ name, bytes }))
        .sort((a, b) => b.bytes - a.bytes),
      repositories: repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updated_at: repo.updated_at,
        created_at: repo.created_at,
        topics: repo.topics,
        is_template: repo.is_template,
        visibility: repo.visibility,
      }))
    };

    cache.set(cacheKey, userData);
    res.json(userData);

  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.message?.includes('API rate limit exceeded')) {
      const resetTime = new Date(error.response.headers['x-ratelimit-reset'] * 1000);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `GitHub API rate limit exceeded. Please try again after ${resetTime.toISOString()}`,
        resetTime: resetTime
      });
    } else {
      console.error('Error:', error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch user data',
        message: error.response?.data?.message || error.message 
      });
    }
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));