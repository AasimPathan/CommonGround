# CommonGround

**Local Voice. Shared Action.**

CommonGround is an influencer campaign marketplace designed to connect local businesses with creators and provide a shared space for community awareness initiatives.

The platform aims to help businesses discover creators for promotional campaigns while enabling creators to showcase their social profiles, explore opportunities, and participate in awareness initiatives.

> **Project status:** Student project / development in progress. Features and integrations may change as development continues.

## Table of Contents

- [Overview](#overview)
- [Goals](#goals)
- [User Roles](#user-roles)
- [Core Features](#core-features)
- [Typical Workflows](#typical-workflows)
- [AI-Assisted Features](#ai-assisted-features)
- [Technology](#technology)
- [Getting Started](#getting-started)
- [Configuration and Integrations](#configuration-and-integrations)
- [Project Scope](#project-scope)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [Author](#author)

## Overview

Local businesses often need relevant creators to promote products, services, events, or campaigns. Creators, meanwhile, need a place to present their profiles and discover suitable opportunities.

CommonGround brings these workflows together in one platform. It also includes a Community area for awareness initiatives, allowing creators to learn about topics and participate in campaigns that support them.

## Goals

- Connect businesses with creators relevant to their campaigns.
- Help creators present their social-media information and supporting evidence.
- Support campaign discovery, creator selection, and campaign progress tracking.
- Give community awareness initiatives a place alongside the marketplace.
- Explore AI assistance for summarizing awareness topics and available creator-profile information.

## User Roles

### Creator
- Create and maintain a creator profile.
- Provide social-media account details and supporting evidence.
- Discover relevant campaigns and opportunities.
- Participate in supported community awareness initiatives.
- Review connection requests and campaign information where available.

### Business
- Create and manage promotional campaigns.
- Discover and filter creators.
- Review creator profiles and available metrics.
- Shortlist or connect with creators through supported workflows.
- Browse Community awareness initiatives and use AI assistance where available.

### Initiative Manager
- Create and manage community awareness initiatives, subject to configured permissions.

### Reviewer / Administrator
- Review submitted initiatives or creator information and manage approval workflows where implemented.

## Core Features

### Influencer Campaign Marketplace
- Business campaign creation.
- Creator discovery and filtering.
- Creator profile details.
- Creator shortlisting and connection workflows.
- Campaign and performance information, depending on implementation status.

### Creator Profiles
- Creator profile setup.
- Social platform and username details.
- Profile URL and supporting evidence.
- Account-check workflow, where implemented.

### Community and Awareness
- Community awareness initiatives.
- Initiative details and creator-support requests.
- Initiative review and publishing workflows, where implemented.
- Awareness video links and related content, where available.

### Connections and Communication
- Business–creator connection requests.
- Connection status handling.
- Communication for accepted connections, where implemented.

## Typical Workflows

**Business campaign workflow**

Create campaign → Discover creators → Apply filters → Review profiles → Shortlist/connect → Track campaign progress.

**Creator workflow**

Sign up → Complete profile → Add social account details → Provide evidence if required → Discover opportunities → Respond to requests.

**Community awareness workflow**

Create initiative → Review → Publish → Creators discover the initiative and participate.

## AI-Assisted Features

### Awareness Topic Summary
The intended Business-side AI assistance can summarize information already provided in an awareness initiative, such as:
- Quick summary.
- Main points.
- Why the topic matters.
- What creators are being asked to support.

The summary should not invent facts that are absent from the initiative.

### Social Profile Check and Summary
The planned Creator-side feature can organize available public profile information or information extracted from creator-uploaded screenshots. It may summarize audience size, visible engagement, content activity, and content niche when those details are available.

**Important limitations:**
- AI summaries do not constitute official verification by a social platform.
- Followers/subscribers are not the same as reach or impressions.
- Missing metrics should be shown as unavailable, not guessed.
- Without platform APIs or another permitted data-access mechanism, automated access to live profile metrics may be limited. Screenshot-based evidence may be needed.
- Actual AI functionality depends on the configured implementation and provider.

## Technology

The application is being developed with a visual application-building workflow. Confirm the actual repository configuration before listing specific frameworks, databases, hosting services, or AI providers here.

Add the technologies used by your project once verified, for example:
- Frontend: `[add framework]`
- Styling/UI: `[add UI library or styling system]`
- Backend/database: `[add service, if used]`
- AI integration: `[add provider, if configured]`
- Deployment: `[add hosting provider]`

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

Replace the placeholders with your actual GitHub repository URL and project folder name.

### 2. Install dependencies

Use the package manager and instructions defined by your project. For a Node.js project that contains a `package.json`, this may be:

```bash
npm install
```

### 3. Configure environment variables

If your application uses environment variables, create a local `.env` file based on the project's documented configuration. Do not commit secrets, passwords, private keys, or API credentials.

### 4. Run the development server

For a project configured with an npm `dev` script, run:

```bash
npm run dev
```

Check `package.json` and the project's setup instructions to confirm the correct commands.

## Configuration and Integrations

Some functionality may depend on configured backend services, database access, file storage, authentication, or an AI provider.

- Do not place secret credentials in client-side code.
- Do not claim social-platform verification unless the verification method actually supports that claim.
- Document required environment variables without including their secret values.
- Clearly distinguish implemented functionality from UI prototypes or planned features.

## Project Scope

CommonGround focuses on two connected areas:

1. **Marketplace:** business campaigns and creator discovery.
2. **Community:** awareness initiatives and creator participation.

AI assistance is intended to support understanding and reviewing available information, not replace evidence, platform permissions, or human review where needed.

## Future Improvements

Potential improvements include:
- More reliable creator profile evidence and review.
- Better campaign progress and performance tracking.
- Clearer connection and notification states.
- More robust awareness initiative management.
- AI summaries with transparent data sources and unavailable-metric handling.
- Additional testing, accessibility, and responsive-design improvements.

These are potential improvements, not a claim that they are already implemented.

## Contributing

For a student project or team contribution:
1. Review the existing implementation before changing code.
2. Keep changes focused and avoid breaking unrelated workflows.
3. Test the affected Creator, Business, and Community flows.
4. Never commit secrets or real user credentials.
5. Update this README when setup instructions or implemented features change.

## Author

**Aasim Pathan**  
BCA Student  
Lok Jagruti Kendra University (LJ University)

---

*CommonGround — Local Voice. Shared Action.*


## Development Workflow

CommonGround uses GitHub to track project documentation and development tasks.

### Current Progress
- README.md created
- GitHub Issue created
- Documentation branch created

### Next Steps
- Connect the existing application source code
- Document the project setup
- Practise commits and pull requests
..
