import { useEffect } from 'react'
import { useCheatInit, useCheatWatcher } from './storage'
import { useStep, Step } from '@remake/hooks'
import ToastContainer from '@/toast'
import Home from '@/containers/Home'
import Mode from '@/containers/Mode'
import Chara from '@/containers/Chara'
import Pick from '@/containers/Pick'
import Alloc from '@/containers/Alloc'
import Play from '@/containers/Play'
import Summary from '@/containers/Summary'
import Achv from '@/containers/Achv'
import Thanks from '@/containers/Thanks'
import HomeCheat from './Home'
import PickCheat from './Pick'
import AllocCheat from './Alloc'
import PlayCheat from './Play'
import SummaryCheat from './Summary'
import { useCheatMode } from './cheatAtom'
import '../Game.css'
import './cheat.css'

export function CheatContainer() {
    const cheat = useCheatMode()
    /* prettier-ignore */
    switch (useStep()) {
        case Step.Idle: return <HomeCheat />
        case Step.Mode: return <Mode />
        case Step.Chara: return <Chara />
        case Step.Pick: return cheat ? <PickCheat /> : <Pick />
        case Step.Alloc: return cheat ? <AllocCheat /> : <Alloc />
        case Step.Play: return cheat ? <PlayCheat /> : <Play />
        case Step.Summary: return cheat ? <SummaryCheat /> : <Summary />
        case Step.Achv: return <Achv />
        case Step.Thanks: return <Thanks />
        default: return null
    }
}

/* prettier-ignore */
const Loading = () => <div className="screen loading"><h2>载入中...</h2></div>
const Saving = ({ active }: { active: boolean }) => (
    <div className={`saving ${active ? 'active' : ''}`}>保存中...</div>
)

export function CheatGame() {
    const [inited, init] = useCheatInit()
    const saving = useCheatWatcher()
    useEffect(() => { if (!inited) init() }, [inited, init])
    if (!inited) return <Loading />
    return <><CheatContainer /><ToastContainer /><Saving active={saving} /></>
}
export default CheatGame