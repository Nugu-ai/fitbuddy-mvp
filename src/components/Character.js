// src/components/Character.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import Lottie from "lottie-react";

// ---------------------------------------
// Lottie JSON 파일 (src/lottie/levelup.json)
// ---------------------------------------
import levelUpAnimation from "../lottie/levelup.json";

// ---------------------------------------
// Google Apps Script 웹앱 URL
// (반드시 실제로 배포된 URL로 바꿔주세요)
// ---------------------------------------
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwS5isKVX48cuAkafURvGgLDh2AIpZhHWTBxob_mHVsKQ14f53BwE4jCOGjg6_8VGjBfA/exec";

// ---------------------------------------
// 캐릭터 목록: ID, 이름, 이미지 경로
// ---------------------------------------
const CHARACTER_LIST = [
    { id: "daehyunggeun", name: "대흉근", img: "/img/대흉근.png" },
    { id: "daetuaesadu", name: "대퇴사두", img: "/img/대퇴사두.png" },
    { id: "bokjikgeun", name: "복직근", img: "/img/복직근.png" },
];

/**
 * JSONP 혹은 순수 JSON 형태의 응답을
 * { success: boolean, successs: boolean, data: any } 형태로 리턴합니다.
 */
function parseJsonpResponse(txt) {
    if (!txt || typeof txt !== "string") {
        return { success: false, successs: false, data: null };
    }
    let str = txt.trim();
    const firstBrace = str.indexOf("{");
    const lastBrace = str.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        const jsonCandidate = str.slice(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(jsonCandidate);
        } catch (e) {
            console.error(
                "parseJsonpResponse: JSON.parse 실패:",
                e,
                jsonCandidate
            );
            return { success: false, successs: false, data: null };
        }
    }
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error("parseJsonpResponse: 순수 JSON 파싱 실패:", e, str);
        return { success: false, successs: false, data: null };
    }
}

export default function Character({ currentUserId }) {
    // 현재 선택된 캐릭터 ID (기본: 첫 번째 캐릭터)
    const [selectedCharId, setSelectedCharId] = useState(CHARACTER_LIST[0].id);
    // { [charId]: level } 형태로 캐릭터별 레벨 저장
    const [levelMap, setLevelMap] = useState({});
    // 레벨업 중 플래그 (로딩 애니메이션용)
    const [isLevelingUp, setIsLevelingUp] = useState(false);

    // “레벨업에 필요한 프로틴” 계산: 현재 레벨 n → 필요 프로틴 = n
    const getRequiredProtein = (level) => level;

    // localStorage 키: 캐릭터 레벨 → "level-<userId>-<charId>"
    const getLevelKey = (userId, charId) => `level-${userId}-${charId}`;
    // localStorage 키: 유저 전체 프로틴 풀 → "userExp-<userId>"
    const getUserExpKey = (userId) => `userExp-${userId}`;

    // localStorage에서 현재 유저 전체 프로틴 풀을 가져옴
    const getUserExp = () => {
        if (!currentUserId) return 0;
        const key = getUserExpKey(currentUserId);
        return parseInt(localStorage.getItem(key) || "0", 10);
    };

    /**
     * localStorage에서 “level-<userId>-<charId>”들을 읽어와 levelMap 초기화
     */
    const loadAllLevels = () => {
        if (!currentUserId) {
            setLevelMap({});
            return;
        }
        const map = {};
        CHARACTER_LIST.forEach(({ id }) => {
            const lvlKey = getLevelKey(currentUserId, id);
            const storedLevel = parseInt(
                localStorage.getItem(lvlKey) || "1",
                10
            );
            map[id] = storedLevel;
        });
        setLevelMap(map);

        // 선택된 캐릭터가 목록에 없다면 첫 번째로 fallback
        if (!CHARACTER_LIST.some((c) => c.id === selectedCharId)) {
            setSelectedCharId(CHARACTER_LIST[0].id);
        }
    };

    // 컴포넌트 마운트되거나 currentUserId가 바뀔 때마다 레벨 정보 로드
    useEffect(() => {
        loadAllLevels();
    }, [currentUserId]);

    /**
     * 서버 “users” 시트에서 해당 userid의 protein 값을 가져옴
     * @param {string} userid
     * @returns {Promise<number>}
     */
    const fetchUserProtein = async (userid) => {
        try {
            const res = await axios.get(SCRIPT_URL, {
                params: { action: "read", table: "users" },
                responseType: "text",
            });
            console.log("[Character] fetchUserProtein raw:", res.data);
            const parsed = parseJsonpResponse(res.data);
            if (!(parsed.success || parsed.successs)) return 0;
            const allUsers = parsed.data || [];
            const found = allUsers.find(
                (row) => String(row.id).trim() === String(userid).trim()
            );
            return found ? parseInt(found.protein || "0", 10) : 0;
        } catch (err) {
            console.error("Character: fetchUserProtein 오류:", err);
            return 0;
        }
    };

    /**
     * 서버 “users” 시트에서 해당 rowId의 protein 값을 업데이트
     * @param {string} rowId
     * @param {number} newProtein
     */
    const updateUserProteinOnServer = async (rowId, newProtein) => {
        if (!rowId) return;
        try {
            const res = await axios.get(SCRIPT_URL, {
                params: {
                    action: "update",
                    table: "users",
                    id: rowId,
                    data: JSON.stringify({ protein: newProtein }),
                },
                responseType: "text",
            });
            console.log("[Character] updateUserProteinOnServer raw:", res.data);
            const parsed = parseJsonpResponse(res.data);
            if (parsed.success || parsed.successs) {
                console.log(
                    "[Character] updateUserProteinOnServer 성공:",
                    parsed.data
                );
            } else {
                console.warn(
                    "[Character] updateUserProteinOnServer 실패:",
                    parsed.data
                );
            }
        } catch (err) {
            console.error("Character: updateUserProteinOnServer 오류:", err);
        }
    };

    /**
     * 서버 “user_characters” 시트에 레벨(newLevel)을 저장
     * (userid, charId 조합만으로 업데이트 또는 insert)
     * @param {string} userid
     * @param {string} charId
     * @param {number} newLevel
     */
    const saveCharacterLevelOnServer = async (userid, charId, newLevel) => {
        try {
            const res = await axios.get(SCRIPT_URL, {
                params: {
                    action: "updateUserCharLevel",
                    userid: userid,
                    charId: charId,
                    level: newLevel,
                },
                responseType: "text",
            });
            console.log(
                `[Character] saveCharacterLevelOnServer raw (userid=${userid}, charId=${charId}):`,
                res.data
            );
            const parsed = parseJsonpResponse(res.data);
            if (parsed.success || parsed.successs) {
                console.log(
                    "[Character] saveCharacterLevelOnServer 성공:",
                    parsed.data
                );
            } else {
                console.warn(
                    "[Character] saveCharacterLevelOnServer 실패:",
                    parsed.data
                );
            }
        } catch (err) {
            console.error("Character: saveCharacterLevelOnServer 오류:", err);
        }
    };

    /**
     * 레벨업 버튼 클릭 시 호출
     */
    const handleLevelUp = async () => {
        if (!currentUserId) return;

        // 1) 레벨업 시작 → Lottie 애니메이션 보여주기 (루프)
        setIsLevelingUp(true);

        try {
            // 2) 서버 프로틴 읽기 → 로컬 동기화
            const serverProtein = await fetchUserProtein(currentUserId);
            const localProtein = getUserExp();
            if (localProtein !== serverProtein) {
                console.log(
                    `[Character] 로컬 프로틴 (${localProtein}) != 서버 프로틴 (${serverProtein}), 동기화`
                );
                localStorage.setItem(
                    getUserExpKey(currentUserId),
                    serverProtein
                );
            }

            // 3) 현재 레벨, 필요 프로틴 계산
            const prevLevel = levelMap[selectedCharId] || 1;
            const required = getRequiredProtein(prevLevel);
            if (serverProtein < required) {
                alert("프로틴이 부족합니다! 루틴을 더 기록하세요.");
                // 애니메이션 중단
                setIsLevelingUp(false);
                return;
            }

            // 4) 레벨업 로직
            const nextLevel = prevLevel + 1;
            const nextProtein = serverProtein - required;

            // 5) 로컬 업데이트 (levelMap, userExp)
            const lvlKey = getLevelKey(currentUserId, selectedCharId);
            localStorage.setItem(lvlKey, nextLevel);
            localStorage.setItem(getUserExpKey(currentUserId), nextProtein);
            setLevelMap((prev) => ({
                ...prev,
                [selectedCharId]: nextLevel,
            }));
            console.log(
                `[Character] 로컬 레벨업: charId=${selectedCharId}, 레벨 ${prevLevel}→${nextLevel}, 프로틴 ${serverProtein}→${nextProtein}`
            );

            // 6) 서버 user_characters 업데이트
            await saveCharacterLevelOnServer(
                currentUserId,
                selectedCharId,
                nextLevel
            );
            // 7) 서버 users 테이블의 프로틴 업데이트
            await updateUserProteinOnServer(currentUserId, nextProtein);
        } catch (e) {
            console.error("[Character] 레벨업 중 오류:", e);
            alert("레벨업 중 오류가 발생했습니다.");
            setIsLevelingUp(false);
            return;
        }

        // 8) 애니메이션이 끝난 뒤 중단
        setIsLevelingUp(false);
    };

    // 현재 선택된 캐릭터 객체 (없으면 첫 번째로 fallback)
    const selectedCharInfo =
        CHARACTER_LIST.find((c) => c.id === selectedCharId) ||
        CHARACTER_LIST[0];

    const currentLevel = levelMap[selectedCharId] || 1;
    const userExp = getUserExp();
    const requiredProteinForNext = getRequiredProtein(currentLevel);

    return (
        <div className="text-center">
            {/* 레벨업 애니메이션 위치: 상단에 Lottie를 루프 켜두기 */}
            {isLevelingUp && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "20px",
                        marginBottom: "20px",
                    }}
                >
                    {/* 원하는 개수만큼 복제해서 여러 개 배치 */}
                    <div style={{ width: 100, height: 100 }}>
                        <Lottie
                            animationData={levelUpAnimation}
                            loop={true}
                            autoplay={true}
                        />
                    </div>
                    <div style={{ width: 100, height: 100 }}>
                        <Lottie
                            animationData={levelUpAnimation}
                            loop={true}
                            autoplay={true}
                        />
                    </div>
                    <div style={{ width: 100, height: 100 }}>
                        <Lottie
                            animationData={levelUpAnimation}
                            loop={true}
                            autoplay={true}
                        />
                    </div>
                </div>
            )}

            {/** 상단: 선택된 캐릭터 큰 뷰 **/}
            <div className="mb-4">
                <img
                    src={selectedCharInfo.img}
                    alt={selectedCharInfo.name}
                    className="img-fluid"
                    style={{ width: "200px" }}
                />
                <h3 className="mt-2">{selectedCharInfo.name}</h3>
                <p className="h5 mb-1">LV. {currentLevel}</p>

                {/** 레벨업 버튼 **/}
                <button
                    className={
                        "btn " +
                        (userExp >= requiredProteinForNext
                            ? "btn-primary"
                            : "btn-secondary")
                    }
                    onClick={handleLevelUp}
                    disabled={isLevelingUp}
                >
                    {isLevelingUp
                        ? "레벨업 중…"
                        : `레벨업 ${userExp} / ${requiredProteinForNext}`}
                </button>
            </div>

            {/** 하단: 캐릭터 카드 그리드 **/}
            <div className="container">
                <div className="row gy-3 gx-2 justify-content-center">
                    {CHARACTER_LIST.map((char) => {
                        const lvl = levelMap[char.id] || 1;
                        const isSelected = char.id === selectedCharId;
                        return (
                            <div
                                key={char.id}
                                className="col-6 col-md-4 col-lg-2"
                                onClick={() => setSelectedCharId(char.id)}
                            >
                                <div
                                    className={
                                        "card h-100 text-center " +
                                        (isSelected ? "border-primary" : "")
                                    }
                                    style={{ cursor: "pointer" }}
                                >
                                    <img
                                        src={char.img}
                                        className="card-img-top"
                                        alt={char.name}
                                        style={{
                                            padding: "0.5rem",
                                            height: "120px",
                                            objectFit: "contain",
                                        }}
                                    />
                                    <div className="card-body px-1 py-2">
                                        <h6 className="card-title mb-1">
                                            {char.name}
                                        </h6>
                                        <p className="mb-1">LV. {lvl}</p>
                                        <small className="text-muted">
                                            {userExp} /{" "}
                                            {getRequiredProtein(lvl)}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
