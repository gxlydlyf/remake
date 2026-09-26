import { useState } from 'react'
import { useAtom } from 'jotai'
import {
    allocAtom,
    useAlloc,
    useReplaced,
    usePicked,
    useStart,
    useIsClassic,
} from '@remake/hooks'
import type { UserAllocation } from '@remake/hooks'
import { properties } from '@/display'
import { keys } from '@remake/vitex'
import { judgeGradeByValue } from '@/config'
import { toastAchvs, toastMsg } from '@/toast'
import Replaced from '@/components/Replaced'
import '../containers/Alloc.css'
import './cheat.css'

interface AllocInputProps {
    point: number
    onChange: (point: number) => void
}

function AllocInput(props: AllocInputProps) {
    return (
        <div className="allocation-input">
            <button onClick={() => props.onChange(props.point - 1)}>−</button>
            <input
                className="font-mono"
                type="number"
                value={props.point}
                onChange={e => props.onChange(Number(e.target.value))}
            />
            <button onClick={() => props.onChange(props.point + 1)}>+</button>
        </div>
    )
}

const maxAt = (n: number) =>
    Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0

/**
 * 破解版属性分配页：
 * - 属性点无任何上限（无限分配）
 * - 可手动输入任意数值
 * - 剩余点数提示替换为"无限属性"
 */
export default function AllocCheat() {
    const isClassic = useIsClassic()
    const picked = usePicked()
    const {
        talents: { chains },
    } = useReplaced()
    const [alloc, setAlloc] = useAtom(allocAtom)
    const { base, final } = useAlloc()
    const start = useStart()
    const [showDetail, setShowDetail] = useState(false)

    const total = Object.values(alloc).reduce((a, b) => a + b, 0)

    const handleChange = (key: keyof UserAllocation, value: number) => {
        setAlloc(prev => ({ ...prev, [key]: maxAt(value) }))
    }

    const handleRandom = () => {
        // 无限随机分配：每项 0 ~ 999
        const randomAlloc = {} as UserAllocation
        for (const key of keys(alloc)) {
            randomAlloc[key] = Math.floor(Math.random() * 1000)
        }
        setAlloc(randomAlloc)
    }

    const handleStart = () => {
        // 无限分配：不做剩余点数校验
        const achievements = start()
        toastAchvs(achievements)
    }

    return (
        <div className="screen point-allocation">
            <div className="cheat-banner">破解版 · 属性无限分配</div>
            <ul className="talent-list">
                {Array.from(picked, id => (
                    <li key={id}>
                        <Replaced id={id} chains={chains.get(id)} />
                    </li>
                ))}
            </ul>
            <ul className={`alloc ${isClassic ? 'classic' : 'modify'}`}>
                <li className="left left-inf">
                    <span className="name">已分配点数</span>
                    <button
                        className="font-mono"
                        onClick={() => setShowDetail(!showDetail)}
                    >
                        {total}
                    </button>
                    {showDetail && (
                        <span className="points-tip">（无上限，可无限分配）</span>
                    )}
                </li>
                {keys(alloc).map(key => (
                    <li
                        key={key}
                        className={`property grade-${judgeGradeByValue(key, final[key])}`}
                    >
                        <span className="name">
                            {properties[key]}
                            {!isClassic && (
                                <span className="font-mono">[{base[key]}]</span>
                            )}
                        </span>
                        {!isClassic && (
                            <span className="font-mono">{final[key]}</span>
                        )}
                        <AllocInput
                            point={alloc[key]}
                            onChange={value => handleChange(key, value)}
                        />
                    </li>
                ))}
            </ul>
            <div className="controls">
                <button className="secondary" onClick={handleRandom}>
                    随机分配（无限）
                </button>
                <button className="primary" onClick={handleStart}>
                    开始新人生
                </button>
            </div>
        </div>
    )
}