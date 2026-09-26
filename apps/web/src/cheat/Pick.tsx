import { useCallback, useMemo, useState } from 'react'
import {
    useCheatTalentPicker,
    useCheatTalentSubmit,
    useRarePull,
    useAllTalents,
    useSetStep,
    Step,
} from './cheatHooks'
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
 * - 与原版一致做互斥检查：选中与已选天赋互斥的天赋时 toast 提示
 */
export default function PickCheat() {
    const [pulled, setPulled] = useState<number[] | null>(null)
    const [showAll, setShowAll] = useState(false)
    // 无限选择 + 互斥检查的 picker
    const [picked, picker, resetPicked] = useCheatTalentPicker()
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
            const result = picker(id)
            if (result.type === 'ex') {
                const conflictName = talents.get(result.talent)?.name ?? '天赋'
                toastMsg(`与已选天赋「${conflictName}」冲突，无法同时选择`, 'pick-toast')
            }
        },
        [picker],
    )

    const handleSubmit = useCallback(() => {
        if (!picked || picked.size < 1) {
            toastMsg('请至少选择一个天赋', 'pick-toast')
            return
        }
        // 提交前做最终互斥校验（双保险）
        const conflict = submit()
        if (conflict) {
            const [newId, existId] = conflict
            const newName = talents.get(newId)?.name ?? '天赋'
            const existName = talents.get(existId)?.name ?? '天赋'
            toastMsg(`天赋「${newName}」与「${existName}」冲突，请调整后重试`, 'pick-toast')
        }
    }, [picked, submit])

    const handleBack = useCallback(() => {
        // 清空选择，返回首页
        resetPicked()
        setShowAll(false)
        setPulled(null)
        setStep(Step.Idle)
    }, [resetPicked, setStep])

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
