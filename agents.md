UI Design Principals
Principle 1: Hierarchy Designers use hierarchy to help users recognize key information and distinguish them from less important elements at a glance. “I often compare designing a digital product or website to designing a book,” Tom says. "On every page, navigational cues remind you of the title, chapter, and content section, so you never get lost.”

Like graphic designers, digital designers often play with the following visual cues to guide users to different elements within a user interface:

Font size and weight. Large and bold fonts stand out and can emphasize important information and buttons. Contrast. The strategic use of contrasting colors directs users to key elements. Spacing. Thoughtful spacing between elements creates visual interest and shows users how different UI elements are related. "Be intentional about what goes where on a screen, especially what users see first and what they have to scroll to see,” Tom suggests. “Consider how you prioritize information: your UI content hierarchy should reflect what the user cares about most.”

Principle 2: Progressive disclosure UX designers typically use progressive disclosure to guide users through a multi-step process, providing the right amount of information to make clear choices at each step.

UI designers can borrow this approach to prioritize what to include in the UI and what to exclude since too many features can be overwhelming.

“Smart digital designers sequence features and flows to make the experience feel less overwhelming,” says Tom. “Consider the UX example of a product onboarding flow, which asks you all about yourself: your name, your contact information, your role, and industry, and maybe what interests you in this product.

If you had to answer all that at once, that screen could look like a long form to fill out—and you might give up before you got started,” he continues.

One thing to watch out for with progressive disclosure is losing users along the way. “Give users a way to orient themselves, so they know where they are and how many steps they have to go,” Tom recommends.

Principle 3: Consistency A good interface feels familiar from the first click. Design systems create this familiarity through consistent patterns—when a button looks and works the same way throughout your product, users stop thinking about the interface and focus on their tasks.

Continuity becomes increasingly important as users advance through a flow. “If one UI button is suddenly bigger, users are going to wonder why,” Tom says. “That irregularity adds to users' cognitive load, creating hesitancy and confusion. So you need a good rationale when you deviate from established patterns.”

Principle 4: Contrast UI designers use contrast strategically to draw attention to important content or features. Tom explains, "For a critical piece of information, you may introduce a higher, more jarring contrast to command the user's attention.”

For example, you may prominently display a “delete account” button in the color red against a white background to immediately grab a user’s attention and reinforce the action. For secondary actions, like “keep account,” the color gray might work well to avoid user confusion.

Pro tip: Use Figma's selection colors feature to explore different color schemes. It’s also a great tool to apply consistent colors and contrast across your final designs.

Principle 5: Accessibility UI designers also carefully contrast colors and luminosity to make designs distinctive and more accessible to users with vision impairments. (Vision impairments affect more than one in four users worldwide.)

Black text on a white background remains standard for printed media, but you can choose different colors using contrast checkers and plugins from Figma's design community.

To ensure your designs are inclusive, be sure to implement what is outlined in the Web Content Accessibility Guidelines (WCAG), including:

Providing alternative text Using appropriate padding rules Ensuring compatibility with assistive technology Providing proper keyboard navigation Using sufficient contrast between foreground and background colors Principle 6: Proximity Things that belong together should stay together. Users naturally perceive UI elements that are close together as related, so this type of visual organization creates a more intuitive user experience and natural user flow.

Take streaming services, for example. Play, fast-forward, and rewind buttons on the same row because they all have something to do with controlling video playback. But you’d never find the quit button in this zone. It lives separately to prevent accidental clicks that could interrupt the viewing experience.

Principle 7: Alignment Clean lines make designs feel professional. A strong grid system helps establish order and balance. Consistent alignment improves readability and creates predictability, making it easier for users to navigate your website or app.

Technology we will want to be using:
JavaScript / TypeScript with a modern web-front-end stack (React + Tailwind or Vue) served as a web application. We will rely on Vite for fast hot-reload and optimized production builds, and we will make use of the browser's screen recording API instead of bundling ffmpeg. Git will be our version-control system, and GitHub Actions will run continuous-integration jobs that build and deploy the web app on every push.

Acutal coding process:
Create files as needed, we do not want to bloat files or have files with thousands of lines that are unreadable.
Group related code by feature inside the src directory (e.g., renderer, export) so each module stays small and cohesive.
We want to create code that is maintanable, safe, and easy to read for other developers.
Make your code efficient and avoid redundancies
Extract any repeated logic into shared utility helpers, and prefer pure functions that can be tested in isolation.
Use semantic versioning and conventional commit messages so changelogs and release notes can be generated automatically.