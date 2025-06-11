# The People's Elbow: Project Overview

## Mission & Philosophy

The People's Elbow is a mutual aid massage therapy service operating under the principle of "Justice. Relief. One elbow at a time." This project demonstrates that community care infrastructure can be built transparently, operated affordably, and replicated freely.

### Core Operating Model

**50/50 No Fee Partnership**: Direct collaboration with local hosts (small businesses, community spaces) where massage services split proceeds equally - 50% to the host or their designated cause, 50% to sustain operations. No intermediaries, no administrative fees.

### Fundamental Principles

1. **Local Symbiosis** - Always partner directly with hosts who receive direct benefit
2. **No Mission Creep** - Amplify host causes rather than impose external agendas  
3. **Mutual Aid over Branding** - Serve communities without data collection or upselling
4. **Accessible Care** - Superhero persona makes wellness services approachable and non-intimidating

## Technical Architecture

**Infrastructure Cost**: ~$10/year running entirely on Cloudflare
- **Static Hosting**: GitHub Pages with Cloudflare proxy
- **Database**: Cloudflare D1 for form submissions and version tracking
- **Forms**: Cloudflare Workers for processing
- **Version System**: Git-based automated build numbering

### Component System (v99-100)
- Universal header/footer components loaded dynamically
- Real-time version badge from D1 database
- Mobile-responsive design with progressive enhancement

## Brand Identity

**Visual Elements**: Emerald green, gold, and blue color palette with comic-book inspired styling
**Persona**: Community-focused superhero character that disarms traditional wellness service barriers
**Tone**: Playful yet sincere, using wrestling/superhero metaphors to make care more accessible

## Target Venues & Communities

Primary focus on suburban metro Atlanta, but designed for replication:
- Card shops and game stores
- Farmers markets
- Community centers
- Small retail businesses
- Local events and gatherings

## Development Philosophy

**Transparency as Feature**: Complete development history visible via changelog/Development Ring
**Community Ownership**: Every line of code documented and freely replicable
**Mutual Aid Tech**: Demonstrates that professional community infrastructure doesn't require expensive platforms

## Replication Guidelines

The entire codebase is designed for community adaptation:
- Fork repository and adapt messaging for local context
- Deploy on Cloudflare infrastructure for minimal cost
- Customize forms and branding while maintaining core mutual aid principles
- Document local adaptations to share with other communities

## Key Success Metrics

- Direct community benefit through 50/50 split model
- Infrastructure sustainability at ~$10/year operational cost
- Replicability by other mutual aid organizations
- Authentic community relationships over traditional marketing metrics

This project serves as both a functional massage therapy coordination platform AND a template demonstrating how mutual aid projects can leverage modern web technology without sacrificing community ownership or transparency. 