import { useCallback } from 'react'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { useRemake, useProfileInject } from '@remake/hooks'
import { loadProfile } from './storage'

/**
 * 破解模式开关。
 * - false：走原版流程
 * - true：走破解版流程（无限天赋 / 好天赋抽取 / 显示全部 / 无限分配 / 自动倍数）
 */
export const cheatModeAtom = atom(false)

export const useCheatMode = () => useAtomValue(cheatModeAtom)

/** 切换模式并加载对应模式的档案（原版 `profile` / 破解版 `profile-cheat`） */
export const useSwitchProfile = () => {
    const setCheat = useSetAtom(cheatModeAtom)
    const profileInject = useProfileInject()
    return useCallback(
        async (cheat: boolean) => {
            setCheat(cheat)
            const profile = await loadProfile(cheat)
            profileInject(profile)
        },
        [setCheat, profileInject],
    )
}

/** 开始原版游戏（原版档案，与破解隔离） */
export const useStartOriginal = () => {
    const switchProfile = useSwitchProfile()
    const remake = useRemake()
    return useCallback(() => {
        void switchProfile(false)
        remake()
    }, [switchProfile, remake])
}

/** 开始破解版游戏（破解版档案，与破解隔离） */
export const useStartCheat = () => {
    const switchProfile = useSwitchProfile()
    const remake = useRemake()
    return useCallback(() => {
        void switchProfile(true)
        remake()
    }, [switchProfile, remake])
}
