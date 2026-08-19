import Navbar from './components/Navbar/Navbar'
import Home from './components/Home/Home'
import About from './components/About/About'
import Stats from './components/Stats/Stats'
import Skills from './components/Skills/Skills'
import Projects from './components/Projects/Projects'
import Terminal from './components/Terminal/Terminal'
import Contact from './components/Contact/Contact'
import Footer from './components/Footer/Footer'
import MusicPlayer from './components/MusicPlayer/MusicPlayer'
import CustomCursor from './components/Effects/CustomCursor'
import ScrollProgress from './components/Effects/ScrollProgress'
import SmoothScroll from './components/Effects/SmoothScroll'
import AuroraBackground from './components/Effects/AuroraBackground'
import ParticleField from './components/Effects/ParticleField'
import Preloader from './components/Preloader/Preloader'

function App() {
  return (
    <div>
      <AuroraBackground />
      <ParticleField />
      <Preloader />
      <SmoothScroll />
      <CustomCursor />
      <ScrollProgress />
      <Navbar />
      <Home />
      <About />
      <Stats />
      <Skills />
      <Projects />
      <Terminal />
      <Contact />
      <Footer />
      <MusicPlayer />
    </div>
  )
}

export default App
