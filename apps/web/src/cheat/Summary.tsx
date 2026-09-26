import { useCheatEnd } from './cheatHooks'
import { useEndJudge } from '@/hooks/judge'
import { properties, judgeDisplay } from '@/display'
import { toastAchvs } from '@/toast'
import '../containers/Summary.css'
import './cheat.css'

/**
 * 破解版人生总结：
 * - 复用与原版一致的属性/综合评价展示
 * - 不显示「锁定天赋，下辈子还能抽到」区（避免激励使用与原版冲突的锁定机制）
 * - 「再次重开」通过 end() 将成就/次数写入破解版独立档案
 */
function Judges() {
    const judges = useEndJudge()
    return (
        <ul className="judge-list">
            {judges.map(([key, { value, grade, level }]) => (
                <li className={`${key} grade-${grade}`} key={key}>
                    <span className="property">{properties[key]}</span>
                    <span className="value font-mono">{value}</span>
                    <span className="level">{judgeDisplay(key, level)}</span>
                </li>
            ))}
        </ul>
    )
}

export default function SummaryCheat() {
    const end = useCheatEnd()
    const handleEnd = () => {
        const achievements = end()
        toastAchvs(achievements)
    }
    return (
        <div className="screen summary">
            <Judges />
            <button className="primary" onClick={handleEnd}>
                再次重开
            </button>
        </div>
    )
}