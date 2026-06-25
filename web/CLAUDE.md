# web

## Responsive design (mandatory)

All newly developed UI components, pages, layouts, dashboards, forms, tables, and navigation elements must be fully responsive and compatible with mobile phones, tablets, laptops, desktops, and large screens. Responsive design must be considered a mandatory requirement for all future UI development.

Apply this to every new or modified UI surface:

- **No horizontal scrolling** on mobile unless absolutely necessary (data tables are the allowed exception).
- **Tables** must stay usable on small screens — keep them inside the shadcn `Table` component (its built-in `overflow-auto` wrapper provides horizontal scroll); never let a table force the whole page to scroll sideways.
- **Forms** adapt across breakpoints — use responsive grids (e.g. `grid-cols-1 md:grid-cols-2`) rather than fixed multi-column layouts.
- **Modals, dialogs, and dropdowns** must be mobile-friendly. The shared `DialogContent` already provides a mobile gutter and `max-h-[90dvh] overflow-y-auto`; do not remove these.
- **Navigation menus** must work on all device sizes. The admin/engineer sidebars are an off-canvas drawer (with backdrop + hamburger trigger in the header) below `lg`, and a static collapsible column at `lg` and up — follow this pattern for any new panel navigation.
- **Cards, grids, and layouts** must reflow with screen width using responsive Tailwind column counts and `gap`s.
- Maintain consistent spacing, typography, and usability across all breakpoints, and ensure **touch-friendly** hit targets for mobile/tablet.

This app uses Appwrite as its backend. See `appwrite.json` for the project's database/collection schema.

`docs/appwrite-llms.txt` is an index of Appwrite documentation pages (titles, URLs, one-line summaries), covering Auth, Databases, Functions, Sites, Messaging, Network, AI integrations, Platform, and Security. Before implementing or debugging Appwrite-related features, check this file for the relevant doc page, then use WebFetch on its URL to pull full details. The index was truncated at the source past the Sites section — if a topic isn't listed, fetch https://appwrite.io/llms.txt or https://appwrite.io/llms-full.txt directly.

## Demo repository

The web repository is developed and maintained independently of the demo repository. For some changes, it may be useful to refer to the UI designs, concepts, or implementation ideas available there — but treat it strictly as a reference source for ideas, design patterns, or implementation approaches.

No code, components, assets, or other content from the demo repository should be directly reused in the web repository. For example, if a UI similar to one found in the demo repository is required here, implement it separately within the web repository rather than copying or directly reusing the demo's existing implementation.
