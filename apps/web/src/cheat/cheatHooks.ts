// 破解模块专用 hooks：复用原版 hooks 能力，但绕过选择数量限制。
import { useCallback } from 'react'
import {
    pickedAtom,
    replacedAtom,
    useSetStep,
    Step,
    useConfig,
    useProfile,
    useGameReset,
    useGameState,
    useSetGameState,
} from '@remake/hooks'
import { useAtomValue, useSetAtom } from 'jotai'
import { pick as corePick, pull as corePull, end as coreEnd } from '@remake/core'
import type { RNG } from '@remake/vitex'
import { talents } from '@remake/data'

export { pickedAtom, replacedAtom, Step } from '@remake/hooks'
export { useSetStep } from '@remake/hooks'

/** 当前已选天赋（无限选择） */
export const useCheatPicked = () => useAtomValue(pickedAtom)

/**
 * 无限选择版 pick：直接调用核心逻辑，不做任何数量限制。
 * 用于提交选择时计算 replacement（含互斥连锁/额外属性）。
 */
export function cheatPick(
    picked: Iterable<number>,
    rng?: RNG,
): ReturnType<typeof corePick> {
    return corePick(picked, rng)
}

/**
 * 无限选择版提交：不校验 min/max，直接计算 replacement 并进入分配页。
 */
export const useCheatTalentSubmit = () => {
    const picked = useAtomValue(pickedAtom)
    const setReplaced = useSetAtom(replacedAtom)
    const setStep = useSetStep()
    return useCallback(
        (rng?: RNG) => {
            if (!picked || picked.size < 1) {
                throw new Error('请至少选择一个天赋')
            }
            setReplaced(cheatPick(picked, rng))
            setStep(Step.Alloc)
        },
        [picked, setReplaced, setStep],
    )
}

/**
 * 好天赋抽取：以"稀有度高权重"的配置抽取一批天赋。
 * 复用原版 pull 的核心抽取逻辑（传入自定义权重），
 * 保证与原版同构、未来同步更新也不受影响。
 */
const RARE_BASE = new Map<number, number>([
    [0, 1],
    [1, 5],
    [2, 40],
    [3, 54],
])

export function useRarePull() {
    const { pull: options } = useConfig()
    const [profile] = useProfile()
    return useCallback(
        (rng?: RNG): number[] => {
            const { count, rate } = options
            // 复用核心 pull，替换 base 权重为"稀有优先"
            const options2 = {
                count,
                rate: { ...rate, base: RARE_BASE },
            }
            // 必须传完整 profile：rate.additions 会读取
            // profile.achievements.size 等字段，传空对象会崩溃
            return corePull(options2, profile, rng)
        },
        [options, profile],
    )
}

/**
 * 显示全部天赋：返回所有非专属天赋 id（按稀有度降序、id 升序）。
 */
export function useAllTalents() {
    return useCallback((): number[] => {
        return Array.from(talents.values())
            .filter(t => !t.exclusive)
            .sort((a, b) => b.grade - a.grade || a.id - b.id)
            .map(t => t.id)
    }, [])
}

/**
 * 破解版收尾：不锁定天赋（避免把 locked 写入原版抽卡配置），
 * 直接将成就/次数等写入当前 profileAtom（由 useCheatWatcher 落到独立 key）。
 */
export const useCheatEnd = () => {
    const [profile, setProfile] = useProfile()
    const state = useGameState()
    const setState = useSetGameState()
    const setStep = useSetStep()
    const reset = useGameReset()
    return useCallback(() => {
        if (!state) throw new Error('Game state is not available.')
        const result = coreEnd(state, profile)
        setProfile(result.profile)
        setState(null)
        setStep(Step.Idle)
        reset()
        return result.achievements
    }, [state, profile, setProfile, setState, setStep, reset])
}