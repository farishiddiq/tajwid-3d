import { IconContext } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import AboutPage from './pages/About'
import ComparePage from './pages/Compare'
import Home from './pages/Home'
import { LetterPage, LettersIndex } from './pages/Letters'
import MakhrajPage from './pages/Makhraj'
import QuizPage from './pages/Quiz'
import SifatPage from './pages/Sifat'
import TafkhimPage from './pages/Tafkhim'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <IconContext.Provider value={{ size: 17, weight: 'regular' }}>
    <HashRouter>
      <ScrollTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="huruf" element={<LettersIndex />} />
          <Route path="huruf/:id" element={<LetterPage />} />
          <Route path="makhraj" element={<MakhrajPage />} />
          <Route path="makhraj/:id" element={<MakhrajPage />} />
          <Route path="sifat" element={<SifatPage />} />
          <Route path="sifat/:id" element={<SifatPage />} />
          <Route path="bandingkan" element={<ComparePage />} />
          <Route path="tafkhim" element={<TafkhimPage />} />
          <Route path="kuis" element={<QuizPage />} />
          <Route path="tentang" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
    </IconContext.Provider>
  )
}
