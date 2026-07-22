// content.js — Dominik Machowiak's real portfolio content + the town layout.
// Single source of truth. 17 hotspots. No invented facts.
// kind: building | sign | board | mailbox | portal   (decides which sprite is drawn)
// x,y = world position of the prop's BASE (feet), in world pixels.

export const INTRO_HINT =
  "Arrow keys / WASD or tap to move  ·  press E (or the button) at anything that glows";

const BASE_N = 344;   // building base (north side of the street)
const BASE_S = 560;   // prop base (south grass)
const ROAD_MID = 408; // vertical middle of the dirt road (road spans world y 336..480)

export const hotspots = [
  // intro — sign sits in the middle of the road
  { id: "welcome",          label: "Start Here",            x: 150,  y: ROAD_MID, kind: "sign"     },

  // about — a "who am I" garden at the start (south), evenly spaced and spread out
  { id: "persona-frontend", label: "Frontend Dev",          x: 180,  y: BASE_S, kind: "sign"     },
  { id: "persona-react",    label: "React",                 x: 460,  y: BASE_S, kind: "sign"     },
  { id: "persona-learner",  label: "Avid Learner",          x: 740,  y: BASE_S, kind: "sign"     },
  { id: "persona-openminded",label:"Open-minded",           x: 1020, y: BASE_S, kind: "sign"     },

  // career street (north buildings), west -> east = 2018 -> now
  { id: "ou",               label: "BSc · Open University", x: 420,  y: BASE_N, kind: "building" },
  { id: "norbert",          label: "Hawthorne (Intern)",    x: 760,  y: BASE_N, kind: "building" },
  { id: "rubicall",         label: "Rubicall",              x: 1100, y: BASE_N, kind: "building" },
  { id: "welcominn",        label: "Welcom-Inn",            x: 1440, y: BASE_N, kind: "building" },
  { id: "deloitte",         label: "Deloitte ★",            x: 1780, y: BASE_N, kind: "building" },
  { id: "projects",         label: "Projects",              x: 2080, y: BASE_N, kind: "building" },

  // testimonials — a "what people say" row, moved to the right, evenly spaced
  { id: "testimonial-norbert",    label: "What Norbert Says",    x: 1340, y: BASE_S, kind: "board" },
  { id: "testimonial-barbara",    label: "What Barbara Says",    x: 1640, y: BASE_S, kind: "board" },
  { id: "testimonial-agnieszka",  label: "What Agnieszka Says",  x: 1940, y: BASE_S, kind: "board" },

  // skills, contact, exit
  { id: "skills",  label: "Skills & Certs", x: 2240, y: BASE_S,   kind: "sign"    },
  { id: "contact", label: "Get in Touch",   x: 2400, y: ROAD_MID, kind: "mailbox" },
  { id: "classic", label: "Classic Site →", x: 2640, y: 430,      kind: "portal"  },
];

export const content = {
  welcome: {
    title: "Hi, I'm Dominik!",
    pages: [{ html:
      `I'm a software developer who specializes in <strong>front-end development</strong>.
       Welcome to my little town! Walk with the <strong>arrow keys / WASD</strong> or by <strong>tapping</strong>,
       then press <strong>E</strong> (or the on-screen button) at anything that glows. The street runs my career
       left&#8209;to&#8209;right — the gardens to the south hold a bit more about me. Enjoy the tour!` }],
  },

  // ---- About personas ----
  "persona-frontend": {
    title: "Frontend Developer",
    pages: [{ html:
      `I'm a passionate frontend developer who loves designing and building great-looking web applications that
       are satisfying &amp; engaging to use. The tools I've used to get here are <strong>HTML5, CSS3, JavaScript</strong>
       and various APIs.` }],
  },
  "persona-react": {
    title: "Aspiring React Developer",
    pages: [{ html:
      `I'm well-versed in HTML, CSS and JavaScript — but I'm always looking to improve and learn more. That's why I've
       spent time learning <strong>React</strong> on top of my frontend experience, and I'm happy to pick up other
       frameworks too.` }],
  },
  "persona-learner": {
    title: "Avid Learner",
    pages: [{ html:
      `What I enjoy most is acquiring knowledge and finding ways to improve my work and myself. I'm always on the
       lookout for new technologies, which keeps me adaptable and agile in how I approach a project.` }],
  },
  "persona-openminded": {
    title: "Open-minded Programmer",
    pages: [{ html:
      `Through my education and work I've gained experience across various programming languages and technologies.
       I'm always looking for new challenges where I can showcase my skills — and hopefully learn even more.` }],
  },

  // ---- Career ----
  ou: {
    title: "BSc Computing & IT Software",
    subtitle: "The Open University · 2018–2021",
    pages: [{ html:
      `Where it began. I earned a <strong>BSc in Computing and IT Software</strong> from The Open University —
       a solid, theory-grounded foundation to build everything else on top of.` }],
  },
  norbert: {
    title: "Intern Front-end Web Developer — Hawthorne Electronics",
    subtitle: "2021",
    pages: [{ html:
      `My first taste of the industry: a volunteer internship as a front-end web developer at
       <strong>Hawthorne Electronics</strong>, a small electronics company. I made changes across their web pages to
       enhance the feel and functionality. Small role, big lessons.` }],
  },
  rubicall: {
    title: "Front-end Web Developer — Rubicall",
    subtitle: "2022–2023",
    pages: [{ html:
      `I designed and built the website for <strong>Rubicall</strong>, a cleaning company, using HTML, CSS and
       JavaScript. They liked it enough to bring me back to expand the site when they moved into the Airbnb business.
       <br><a href="https://www.rubicall.co.uk/" target="_blank" rel="noopener">See it live ↗</a>` }],
  },
  welcominn: {
    title: "Web Developer — Welcom-Inn",
    subtitle: "2023–2024",
    pages: [{ html:
      `At <strong>Welcom-Inn</strong> I designed and built the website for a property-management company with HTML,
       CSS and JavaScript. It's live and advertising their properties and services.
       <br><a href="https://welcom-inn.co.uk/" target="_blank" rel="noopener">Visit it ↗</a>` }],
  },
  deloitte: {
    title: "Salesforce Marketing Cloud Developer — Deloitte",
    subtitle: "2024–Present",
    pages: [
      { html:
        `Right now I'm a Salesforce Marketing Cloud Developer at <strong>Deloitte</strong>. I led a marketing
         automation project for a Polish automotive client — providing technical consultation and developing &amp;
         deploying scalable solutions with marketing technologies.` },
      { html:
        `The headline number: as part of a marketing transformation across multiple car brands, I built
         <strong>~300 email &amp; SMS messages in Email Studio</strong> using HTML, CSS, JavaScript and
         <strong>AMPScript</strong>.` },
    ],
  },
  projects: {
    title: "Selected Projects",
    pages: [
      { html:
        `<strong>Welcom-Inn Website</strong> — a modern, responsive site for a property-management company.
         <a href="https://welcom-inn.co.uk/" target="_blank" rel="noopener">welcom-inn.co.uk ↗</a>` },
      { html:
        `<strong>Rubicall Website</strong> — a modern, responsive site for a cleaning company.
         <a href="https://www.rubicall.co.uk/" target="_blank" rel="noopener">rubicall.co.uk ↗</a>` },
      { html:
        `<strong>MERN Project</strong> — a full-stack app built on the MERN stack. Currently in progress —
         watch this space!` },
    ],
  },

  // ---- Testimonials (paraphrased, attributed — not verbatim quotes) ----
  "testimonial-norbert": {
    title: "What Norbert says",
    subtitle: "Hawthorne Electronics",
    pages: [{ html:
      `Norbert says I gave their website a remarkable transformation — praising my professionalism, attention to
       detail, and a seamless experience that impressed their customers and boosted their online presence.` }],
  },
  "testimonial-barbara": {
    title: "What Barbara says",
    subtitle: "Rubicall",
    pages: [{ html:
      `Barbara was thrilled with the website I built for her cleaning business. She found me patient and easy to work
       with, loved that it works great on phones and computers, and happily recommends me to other businesses.` }],
  },
  "testimonial-agnieszka": {
    title: "What Agnieszka says",
    subtitle: "Welcom-Inn",
    pages: [{ html:
      `Agnieszka appreciated the functional website and my patient guidance. She says it effectively showcases their
       rental properties and services and has improved their online presence.` }],
  },

  // ---- Skills / Contact / Exit ----
  skills: {
    title: "Skills & Certifications",
    pages: [{ html:
      `My core toolkit is <strong>HTML, CSS, JavaScript and React</strong>, and I keep reaching for more — TypeScript,
       Sass, Redux, Node, GraphQL, Git and Figma. On the Salesforce side I'm a certified
       <strong>Marketing Cloud Email Specialist</strong> and a <strong>Trailhead Mountaineer</strong>.` }],
  },
  contact: {
    title: "Get in Touch",
    pages: [{ html:
      `I'm always happy to chat about new opportunities.
       <br>📧 <a href="mailto:dominikmachowiak101@gmail.com">dominikmachowiak101@gmail.com</a>
       <br>💼 <a href="https://www.linkedin.com/in/dominikmachowiak/" target="_blank" rel="noopener">linkedin.com/in/dominikmachowiak</a>` }],
  },
  classic: {
    title: "Prefer the classic site?",
    pages: [{ html:
      `That's the tour — thanks for playing! For the traditional, detailed version of my portfolio, step through
       the doorway.
       <br><a href="https://dominikmachowiak.com" rel="noopener">Open the classic site ↗</a>` }],
  },
};

export const TOTAL = hotspots.length;
