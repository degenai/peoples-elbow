# The People's Elbow

Official website for The People's Elbow: Mutual Aid Massage - A superhero-themed massage therapy service bringing care directly to card shops and community spaces.

## About The Project

The People's Elbow is a mutual aid massage initiative that:
- Operates on a 50/50 split model with hosting venues
- Brings massage therapy to card shops, farmers markets, and community spaces
- Embodies mutual aid principles without upselling or data collection
- Creates a superhero persona to make care more approachable

## Website Features

- Responsive design with mobile-friendly navigation
- Host connection system for venues to request services
- Community impact tracker
- Location finder for service areas
- Contact forms for inquiries

## GitHub Pages Setup

This site is configured to be hosted on GitHub Pages. To enable GitHub Pages:

1. Go to the repository settings
2. Scroll down to the "GitHub Pages" section
3. Select "main" as the source branch
4. Save the changes

The site will be published at https://degenai.github.io/peoples-elbow/

## Cloudflare Configuration

To connect your custom domain (peoples-elbow.com) via Cloudflare:

1. Add your domain to Cloudflare
2. Update your domain's nameservers to Cloudflare's nameservers
3. Create a CNAME record:
   - Name: www
   - Target: degenai.github.io
   - Proxy status: Proxied

The CNAME file in this repo is already configured for peoples-elbow.com

## Development

### Local Setup

1. Clone the repository
```
git clone https://github.com/degenai/peoples-elbow.git
```

2. Navigate to the project directory
```
cd peoples-elbow
```

3. Open index.html in your browser or use a local server

### Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project embodies mutual aid principles. Feel free to adapt and reuse with attribution.

## Contact

Alex - License #MT013193 - info@peoples-elbow.com

Project Link: [https://github.com/degenai/peoples-elbow](https://github.com/degenai/peoples-elbow)

## Automated Conflict Resolution for `js/version-data.js`

This project uses a custom Git merge driver to automatically resolve merge conflicts that can occur on the auto-generated `js/version-data.js` file. This file is updated based on the Git commit history and is prone to conflicts during merges (e.g., when merging `main` into a feature branch).

To enable this automated conflict resolution in your local repository clone, you need to configure the merge driver by running the following commands in your terminal from the root of the project:

```bash
git config --local merge.generated.name "Regenerate version-data.js"
git config --local merge.generated.driver "node generate-version-data.js && git add js/version-data.js"
```

**Explanation:**
*   The `.gitattributes` file in this repository tells Git to use a merge strategy named `generated` for `js/version-data.js`.
*   The commands above define what the `generated` strategy does: it runs the `node generate-version-data.js` script to rebuild the file based on the current (merged) commit history and then stages the result, thereby resolving the conflict.

Setting this up will streamline your development workflow by handling these specific conflicts automatically.