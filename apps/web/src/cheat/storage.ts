// 破解版存储：与「原版」成就/次数/事件/天赋数据完全隔离。
//
// 原版使用 localStorage key `profile`，破解版使用 `profile-cheat`，
// 两者互不影响。本模块不修改原版 apps/web/src/hooks/storage.ts，
// 而是复刻同一套流程、仅替换 key，便于原作者更新时同步。
import { useEffect, useCallback, useTransition } from 'react'
import { atom, useAtom, useAtomValue } from 'jotai'
import {
    useConfigInject,
    useProfileInject,
    useRawProfile,
    useUniqueInject,
    useUnique,
    type ProfileState,
} from '@remake/hooks'
import { init, get, set } from '@/storage'
import { config } from '@/config'
import { cheatModeAtom } from './cheatAtom'

/** 原版档案 key */
export const KEY_ORIGINAL = 'profile'
/** 破解版档案 key（独立，隔离成就） */
export const KEY_CHEAT = 'profile-cheat'

const initedAtom = atom(false)

/** 把存储中的原始字符串解析为完整 ProfileState */
export const parseProfile = (raw: string | null): ProfileState => {
    const parsed = raw ? JSON.parse(raw) || {} : {}
    return {
        ...parsed,
        times: parsed.times || 0,
        achievements: new Set(parsed.achievements || []),
        events: new Set(parsed.events || []),
        talents: new Set(parsed.talents || []),
    } as ProfileState
}

/** 读取指定模式的档案（原版 / 破解版） */
export const loadProfile = async (cheat: boolean): Promise<ProfileState> => {
    const raw = await get(cheat ? KEY_CHEAT : KEY_ORIGINAL)
    return parseProfile(raw)
}

/**
 * 破解版初始化：默认加载原版档案（cheatMode 初始为 false），
 * 玩家点击「开始破解版游戏」时再切换为破解档案。
 */
export const useCheatInit = () => {
    const configInject = useConfigInject()
    const profileInject = useProfileInject()
    const uniqueInject = useUniqueInject()
    const [inited, setInited] = useAtom(initedAtom)
    const loader = useCallback(async () => {
        if (inited) return
        configInject(config)
        await init()
        profileInject(await loadProfile(false))
        const unique = await get('unique')
        if (unique) uniqueInject(JSON.parse(unique))
        setInited(true)
    }, [inited, configInject, profileInject, uniqueInject, setInited])
    return [inited, loader] as const
}

/**
 * 破解版保存：根据当前模式写入对应 key，保证原版/破解版数据隔离。
 */
export const useCheatWatcher = () => {
    const [profile] = useRawProfile()
    const unique = useUnique()
    const cheat = useAtomValue(cheatModeAtom)
    const [inited] = useAtom(initedAtom)
    const [p, saveProfile] = useTransition()
    const [u, saveUnique] = useTransition()
    useEffect(() => {
        if (!inited || !profile) return
        const str = JSON.stringify({
            ...profile,
            times: profile.times,
            achievements: Array.from(profile.achievements),
            events: Array.from(profile.events),
            talents: Array.from(profile.talents),
        })
        const key = cheat ? KEY_CHEAT : KEY_ORIGINAL
        saveProfile(async () => {
            await set(key, str)
        })
    }, [inited, profile, cheat, saveProfile])
    useEffect(() => {
        if (!inited || !unique) return
        const str = JSON.stringify(unique)
        saveUnique(async () => {
            await set('unique', str)
        })
    }, [inited, unique, saveUnique])

    return p || u
}
