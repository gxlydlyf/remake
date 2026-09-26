import { useCallback, useMemo, useState } from 'react'
import {
    useCheatPicked,
    useCheatTalentSubmit,
    useRarePull,
    useAllTalents,
    useSetStep,
    Step,
} from './cheatHooks'
import { useAtom } from 'jotai'
import { pickedAtom } from '@remake/hooks'
import { talents } from '@remake/data'
import { PullCount } from '@/config'
import { toastMsg } from '@/toast'
import Talent from '@/components/Talent'
import '../containers/Pick.css'
import './cheat.css'

/**
 * 破解版天赋选择页：
 * - "10 连抽 · 稀有优先"：每次抽取一批"高稀有度"天赋
 * - "显示全部天赋"：列出所有非专属天赋供任意挑选
 * - 已选天赋无数量上限（无限选择）
 */
export default function PickCheat() {
    const [pulled, setPulled] = useState<number[] | null>(null)
    const [showAll, setShowAll] = useState(false)
    // 直接读写原版 pickedAtom，无数量限制
    const [picked, setPicked] = useAtom(pickedAtom)
    const setStep = useSetStep()
    const rarePull = useRarePull()
    const allTalents = useAllTalents()
    const submit = useCheatTalentSubmit()

    // 可选池：
    // - 显示全部：所有非专属天赋（稀有度降序、id 升序）
    // - 否则：已抽出的天赋
    const pool = useMemo(() => {
        if (showAll) return allTalents()
        return pulled ?? []
    }, [showAll, pulled, allTalents])

    const handlePull = useCallback(() => {
        setShowAll(false)
        setPulled(rarePull())
    }, [rarePull])

    const handlePullAll = useCallback(() => {
        setShowAll(true)
        setPulled(allTalents())
    }, [allTalents])

    const handlePick = useCallback(
        (id: number) => {
            setPicked(prev => {
                const cur = prev ?? new Set<number>()
                const next = new Set(cur)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
            })
        },
        [setPicked],
    )

    const handleSubmit = useCallback(() => {
        if (!picked || picked.size < 1) {
            toastMsg('请至少选择一个天赋', 'pick-toast')
            return
        }
        // 无限选择版提交：计算 replacement（含互斥连锁）并进入分配页
        submit()
    }, [picked, submit])

    const handleBack = useCallback(() => {
        // 清空选择，返回首页
        setPicked(new Set())
        setShowAll(false)
        setPulled(null)
        setStep(Step.Idle)
    }, [setPicked, setStep])

    if (!pulled && !showAll)
        return (
            <div className="screen talent-pick">
                <div className="cheat-pick-actions">
                    <button className="primary font-mono focus" onClick={handlePull}>
                        {PullCount} 连抽 · 稀有优先
                    </button>
                    <button className="cheat-btn font-mono focus" onClick={handlePullAll}>
                        显示全部天赋
                    </button>
                </div>
            </div>
        )

    return (
        <div className="screen talent-pick">
            <div className="cheat-pick-toolbar">
                <span className="cheat-pick-info font-mono">已选 {picked?.size ?? 0} 个</span>
                <button className="cheat-btn" onClick={handlePull}>
                    重新抽稀有
                </button>
                <button className="cheat-btn" onClick={handlePullAll}>
                    {showAll ? '全部天赋' : '显示全部'}
                </button>
            </div>
            <ul className="talent-list">
                {pool.map(id => (
                    <li key={id} onClick={() => handlePick(id)}>
                        <Talent id={id} selected={picked?.has(id) ?? false} />
                    </li>
                ))}
            </ul>
            <div className="controls">
                <button className="secondary" onClick={handleBack}>
                    返回
                </button>
                <button className="primary" onClick={handleSubmit}>
                    下一步
                </button>
            </div>
        </div>
    )
}