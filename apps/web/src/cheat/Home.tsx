import { useCallback } from 'react'
import { useStartOriginal, useStartCheat, useSwitchProfile } from './cheatAtom'
import { useGoAchv, useGoThanks } from '@remake/hooks'
import { TextSvg } from '@/components/TextSvg'
import ThemeToggle from '@/components/ThemeToggle'
import Github from '@/components/Github'
import GithubCheat from './Github'
import '../containers/Home.css'
import './cheat.css'

export default function HomeCheat() {
    const startOriginal = useStartOriginal()
    const startCheat = useStartCheat()
    const goAchv = useGoAchv()
    const goThanks = useGoThanks()
    const switchProfile = useSwitchProfile()

    // 查看【原版】成就：先加载原版档案，再进入成就页
    const goOriginalAchv = useCallback(() => {
        void switchProfile(false).then(goAchv)
    }, [switchProfile, goAchv])
    // 查看【破解版】成就：先加载破解版档案，再进入成就页
    const goCheatAchv = useCallback(() => {
        void switchProfile(true).then(goAchv)
    }, [switchProfile, goAchv])

    return (
        <div className="screen home">
            <div className="title">
                <TextSvg text="人生重开模拟器" className="main" />
                <TextSvg text="这垃圾人生一秒也不想待了" className="sub" />
            </div>
            <div className="controls">
                <div>
                    <button className="primary focus" onClick={startOriginal}>
                        开始原版游戏
                    </button>
                </div>
                <div>
                    <button className="cheat-home-btn focus" onClick={startCheat}>
                        开始破解版游戏
                    </button>
                </div>
                <div>
                    <button className="secondary" onClick={goOriginalAchv}>
                        原版成就
                    </button>
                    <button className="secondary" onClick={goCheatAchv}>
                        破解版成就
                    </button>
                </div>
                <div>
                    <button className="secondary" onClick={goThanks}>
                        感谢
                    </button>
                </div>
            </div>
            <div className="actions">
                <Github />
                <ThemeToggle />
            </div>
            {/* 左下角红色边框 GitHub，指向破解版仓库 */}
            <GithubCheat />
        </div>
    )
}