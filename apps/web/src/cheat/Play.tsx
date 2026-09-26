import { useState, useRef, useCallback } from 'react'
import { useLayoutEffect, useEffect } from 'react'
import { useAtom } from 'jotai'
import { useSetAtom } from 'jotai'
import {
    useProfile,
    gameStateAtom,
    logsAtom,
    summaryAtom,
    stepAtom,
    Step,
    type Log,
} from '@remake/hooks'
import { next as coreNext, summary as coreSummary } from '@remake/core'
import type { GameState } from '@remake/core'
import { useJudge } from '@/hooks/judge'
import { achievements, events, talents } from '@remake/data'
import { properties } from '@/display'
import { AutoInterval } from '@/config'
import { format } from '@remake/vitex'
import { toastAchvs } from '@/toast/Achv'
import '../containers/Play.css'
import './cheat.css'

function LogTalent({ id }: { id: number }) {
    const { name, description, grade } = talents.get(id)!
    return (
        <li className={`grade-${grade}`}>
            <span className="tag font-mono">[天赋]</span>
            <span className="name">{name}</span>
            <span className="description">{description}</span>
        </li>
    )
}

function LogTalents({ items }: { items: number[] }) {
    if (items.length === 0) return null
    const els = items.map(id => <LogTalent key={id} id={id} />)
    return <ul className="log-inner log-talents">{els}</ul>
}

const year = new Date().getFullYear()
interface LogEventProps {
    id: number
    post: boolean
    index: number
}
function LogEvent({ id, post, index }: LogEventProps) {
    let { event, postEvent, grade, format: f } = events.get(id)!
    if (f) {
        const g = (key: string) => ({ CurrentYear: year + index })[key]
        event = format(event, g)
        if (post && postEvent) postEvent = format(postEvent, g)
    }
    return (
        <>
            <li className={`grade-${grade}`}>{event}</li>
            {post && postEvent && (
                <li className={`grade-${grade}`}>{postEvent}</li>
            )}
        </>
    )
}

function LogEvents({ items, index }: { items: number[]; index: number }) {
    const last = items.length - 1
    const els = items.map((id, i) => (
        <LogEvent key={id} id={id} post={i == last} index={index} />
    ))
    return <ul className="log-inner log-events">{els}</ul>
}

function LogAchievement({ id }: { id: number }) {
    const { name, description, grade } = achievements.get(id)!
    return (
        <li className={`grade-${grade}`}>
            <span className="tag font-mono">[成就]</span>
            <span className="name">{name}</span>
            <span className="description">{description}</span>
        </li>
    )
}

function LogAchievements({ items }: { items: number[] }) {
    if (items.length === 0) return null
    const els = items.map(id => <LogAchievement key={id} id={id} />)
    return <ul className="log-inner log-achievements">{els}</ul>
}

function Log({ log, index }: { log: Log; index: number }) {
    return (
        <li className="log">
            <span className="age font-mono">{log.age}岁</span>
            <div className="content">
                <LogTalents items={log.talents} />
                <LogEvents items={log.events} index={index} />
                <LogAchievements items={log.achievements} />
            </div>
        </li>
    )
}

interface PropProps {
    prop: keyof typeof properties
    value: number
    grade: number
}

function Prop({ prop, value, grade }: PropProps) {
    const prevRef = useRef<number>(value)
    const [trend, setTrend] = useState<'up' | 'down' | 'normal'>('normal')
    const [flip, setFlip] = useState(0)
    const [displayValue, setDisplayValue] = useState<number>(value)
    useEffect(() => {
        const prev = prevRef.current
        if (value === prev) return
        const startValue = prevRef.current
        prevRef.current = value
        setTrend(value > prev ? 'up' : 'down')
        setFlip(f => (f + 1) % 2)
        let startTimestamp: number | null = null
        const duration = 400
        let end = false
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp
            const progress = timestamp - startTimestamp
            const progressRatio = Math.min(progress / duration, 1)
            const easeOutQuad = progressRatio * (2 - progressRatio)
            const currentDec = startValue + (value - startValue) * easeOutQuad
            setDisplayValue(Math.round(currentDec))
            if (!end && progress < duration) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
        const timer = setTimeout(() => setTrend('normal'), 2000)
        return () => {
            clearTimeout(timer)
            setDisplayValue(value)
            end = true
        }
    }, [value])

    return (
        <li className={`${prop} grade-${grade} trend-${trend}-${flip}`}>
            <span className="name">{properties[prop]}</span>
            <span className="value font-mono">{displayValue}</span>
        </li>
    )
}

function Properties() {
    const judges = useJudge()
    return (
        <ul className="properties">
            {judges.map(([key, { value, grade }]) => (
                <Prop key={key} prop={key} value={value} grade={grade} />
            ))}
        </ul>
    )
}

/**
 * 破解版游戏页：
 * - 保留原版手动点击/自动推进
 * - 新增"倍数"输入：加快自动模式的推进速度
 *   （倍数=1 为原版速度；倍数=N 时 tick 间隔缩短为 AutoInterval/N，
 *    每次 tick 仍只推进 1 年，因此年龄始终 1→2→3… 正常递增）
 *
 * 直接操作 jotai 的 gameStateAtom / logsAtom + 核心 next()，
 * 而非 useNext() 闭包：useNext 返回的 nexter 捕获的是本次 render
 * 的 state，interval 过快时 React 未及时重渲染就会导致
 * 重复年龄日志。改为每次从 atom 读取最新 state，保证年龄严递增。
 */
export function PlayCheat() {
    const [state, setState] = useAtom(gameStateAtom)
    const [logs, setLogs] = useAtom(logsAtom)
    const [profile] = useProfile()
    const [auto, setAuto] = useState(false)
    const [speed, setSpeed] = useState(1)
    const logRef = useRef<HTMLUListElement>(null)
    const autoRef = useRef(0)
    const processRef = useRef(false)
    const endedRef = useRef(false)
    // 始终持有最新 state：高倍速 interval 时 render 可能跟不上，
    // 若用闭包里的 state 会基于过期状态推进，产生重复年龄日志
    const stateRef = useRef<GameState | null>(state)
    stateRef.current = state
    const setSummary = useSetAtom(summaryAtom)
    const setStep = useSetAtom(stepAtom)
    // 人生是否已结束（生命值 <= 0）
    const ended = !!state && state.life <= 0

    const handleNext = useCallback(() => {
        if (endedRef.current) {
            setAuto(false)
            return
        }
        if (processRef.current) return
        processRef.current = true
        let achievements: number[] = []
        const latest = stateRef.current
        try {
            if (!latest) throw new Error('Game state is not available.')
            // 直接调用核心 next，从 stateRef 取最新 state
            const { state: s, ...result } = coreNext(latest, profile)
            stateRef.current = s
            setState(s)
            const { age, ...props } = s.props.current
            const log = { ...result, props }
            setLogs(prev => [...prev, log])
            if (s.life <= 0) endedRef.current = true
            achievements = result.achievements
        } catch {
            // 人生已结束，停止自动模式
            setAuto(false)
        }
        toastAchvs(achievements)
        processRef.current = false
    }, [profile, setState, setLogs])

    const handleGotoSummary = useCallback(() => {
        const latest = stateRef.current
        // 人生未结束前不允许跳转（life > 0 时拦截）
        if (!latest || latest.life > 0) return
        try {
            const result = coreSummary(latest, profile)
            setSummary(result.summary)
            setState(result.state)
            stateRef.current = result.state
            setStep(Step.Summary)
            toastAchvs(result.achievements)
        } catch {
            // 忽略异常
        }
    }, [profile, setSummary, setState, setStep])

    useLayoutEffect(() => {
        requestAnimationFrame(() => {
            if (!logRef.current) return
            logRef.current.scrollTop = logRef.current.scrollHeight
        })
    }, [logs])

    useEffect(() => {
        if (!auto) {
            window.clearInterval(autoRef.current)
            return
        }
        // 倍速：tick 间隔 = 原版间隔 / 倍数
        const interval = Math.max(1, Math.round(AutoInterval / speed))
        autoRef.current = window.setInterval(handleNext, interval)
        return () => window.clearInterval(autoRef.current)
    }, [auto, speed, handleNext])

    const clampSpeed = (v: number) => {
        const n = Math.floor(Number(v))
        if (!Number.isFinite(n) || n < 1) return 1
        if (n > 1000) return 1000
        return n
    }

    return (
        <div className="screen play">
            <Properties />
            <ul
                className="logs hide-scrollbar"
                onClick={handleNext}
                ref={logRef}
            >
                {logs.map((log, index) => (
                    <Log key={index} log={log} index={index} />
                ))}
            </ul>
            <div className="controls">
                {!ended && (
                    <>
                        <label className="cheat-speed">
                            <span>倍数</span>
                            <input
                                className="font-mono"
                                type="number"
                                min={1}
                                max={1000}
                                value={speed}
                                onChange={e => setSpeed(clampSpeed(Number(e.target.value)))}
                            />
                        </label>
                        <button className="primary" onClick={() => setAuto(!auto)}>
                            {auto ? '关闭自动' : '开启自动'}
                        </button>
                    </>
                )}
                {ended && (
                    <button className="primary" onClick={handleGotoSummary}>
                        人生总结
                    </button>
                )}
            </div>
        </div>
    )
}

export default PlayCheat