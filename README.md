# slow-reader

Slow reader is a deliberate, thoughtful and slow reader app. It is designed to
work with you to make your information consumption curated and slow. Slow reader
replaces workflows that rely on social media, link aggregators or a few trusted
news sources, and presents you with a single feed of well-curated, medium to
long form articles that you have to consume in order.

You shouldn't be scanning headlines on twitter or post titles on HN to keep up
with the world and form half-baked opinions; Slow reader gives you stuff that
you should read fully and a good reason to do so.

Behind Slow reader is a tailored LLM-powered agent with tooling to build your
feed. You configure the agent with the sources and topics you care about, and it
builds a regular feed for you. You can provide feedback about posts and it'll
learn from them.

## Features

1. A beautiful web reader: Slow reader ships with a simple, elegant and very
   usable web reader with support for annotations.

1. Readability by default: When reading web articles, Slow reader will by
   default show you the main content of the article without any external
   styling.

1. One article at a time: You get the title, the source, and a brief on why you
   should read this, and you're only allowed to move forward once you've read
   the article.

1. Composite articles: If there isn't a single external post worth referring to,
   your agent will write an article that captures it broadly so you can catch up
   without reading hundreds of posts or comments.

1. Tailored, justified curation: with assistance from you, the LLM agent will
   pull relevant information and curate it to be meaningful and important to
   you, so you never feel like you're slogging through irrelevant posts. Bring
   your own keys and endpoints.

1. Feedback: didn't like something? Note down your feedback and your agent
   improves.

1. Powerful customization: pick your own sources and feed cadence. Want to pull
   from Hacker News comments? Or use your twitter feed as a starting point? Slow
   reader's agent is built to use a standard, persisted browser, so you can give
   it pointers and it does the rest.

### Non-goals

1. Authentication: Slow reader is personal. Multi-user is not planned. Put it
   behind a reverse proxy with basic auth or a VPN like tailscale.
1. Any non-web client: Use your browser.

## Technical Details

Slow reader is built on Bun with Elysia in TypeScript. It is fully server
rendered. It uses a single SQLite database. You should consider using litestream
to back up the database, and setting up Jaeger for OpenTelemetry traces, but you
aren't required to. See the "bare minimum" `docker-compose.yml`, and the
"maximalist" `docker-compose-full.yml` for comparison.
