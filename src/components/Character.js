// src/components/Character.js
import React, { useState, useEffect } from "react";
import axios from "axios";

// ---------------------------------------
// Google Apps Script 웹앱 URL
// (앱 스크립트를 웹앱으로 배포한 URL을 정확히 입력)
// ---------------------------------------
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyd7cpGUGtVsNQdDm3jVIV-PVcFK4vvlY4RHMGKKpsqnzZC2FrMZyTOoqNsFAGjsX5z6g/exec";

// ---------------------------------------
// 캐릭터 목록: ID, 이름, 이미지 경로
// ---------------------------------------
const CHARACTER_LIST = [
    { id: "daehyunggeun", name: "대흉근", img: "/img/대흉근.png" },
    { id: "daetuaesadu", name: "대퇴사두", img: "/img/대퇴사두.png" },
    { id: "bokjikgeun", name: "복직근", img: "/img/복직근.png" },
];

/**
 * JSONP 형태의 Google Apps Script 응답을 파싱해서
 * { success: boolean, successs: boolean, data: any } 객체를 리턴합니다.
 */
function parseJsonpResponse(txt) {
    if (typeof txt === "string" && txt.startsWith("undefined(")) {
        try {
            const jsonStr = txt.slice("undefined(".length, -1);
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("parseJsonpResponse: JSONP 파싱 실패:", e, txt);
            return { success: false, successs: false, data: null };
        }
    }
    try {
        return JSON.parse(txt);
    } catch (e) {
        console.error("parseJsonpResponse: 순수 JSON 파싱 실패:", e, txt);
        return { success: false, successs: false, data: null };
    }
}

export default function Character({ currentUserId }) {
    // 현재 선택된 캐릭터 ID (기본: 첫 번째 캐릭터)
    const [selectedCharId, setSelectedCharId] = useState(CHARACTER_LIST[0].id);
    // { [charId]: level } 형태로 캐릭터별 레벨을 저장
    const [levelMap, setLevelMap] = useState({});

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
     * localStorage에서 “level-<userId>-<charId>”들을 읽어와 levelMap을 구성
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

        // 만약 현재 선택된 캐릭터 ID가 CHARACTER_LIST에 없으면 첫 번째로 fallback
        if (!CHARACTER_LIST.some((c) => c.id === selectedCharId)) {
            setSelectedCharId(CHARACTER_LIST[0].id);
        }
    };

    // 컴포넌트 마운트되거나 currentUserId가 변경될 때마다 레벨 정보 로드
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
            const parsed = parseJsonpResponse(res.data);
            if (!parsed.success && !parsed.successs) return 0;

            const allUsers = parsed.data || [];
            // 타입 차이(숫자 vs 문자열) 방지를 위해 String()으로 비교
            const found = allUsers.find(
                (row) => String(row.id) === String(userid)
            );
            return found ? parseInt(found.protein, 10) : 0;
        } catch (err) {
            console.error("Character: fetchUserProtein 오류:", err);
            return 0;
        }
    };

    /**
     * 서버 “users” 시트에서 rowId의 protein 값을 업데이트
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
            const parsed = parseJsonpResponse(res.data);
            // success 혹은 successs가 true면 성공 ⇒ 로그 남김
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
     * 서버 “user_characters” 시트에서 (userid,charId)에 해당하는 row를 찾아 ID 리턴
     * @param {string} userid
     * @param {string} charId
     * @returns {Promise<string|null>}
     */
    const fetchCharacterRowId = async (userid, charId) => {
        try {
            const res = await axios.get(SCRIPT_URL, {
                params: { action: "read", table: "user_characters" },
                responseType: "text",
            });
            const parsed = parseJsonpResponse(res.data);
            if (!parsed.success && !parsed.successs) return null;

            const allRows = parsed.data || [];
            const found = allRows.find(
                (row) =>
                    String(row.userid) === String(userid) &&
                    String(row.charId) === String(charId)
            );
            return found ? found.id : null;
        } catch (err) {
            console.error("Character: fetchCharacterRowId 오류:", err);
            return null;
        }
    };

    /**
     * 서버 “user_characters” 시트에 레벨 저장
     * @param {string} userid
     * @param {string} charId
     * @param {number} newLevel
     */
    const saveCharacterLevelOnServer = async (userid, charId, newLevel) => {
        const existingRowId = await fetchCharacterRowId(userid, charId);

        if (existingRowId) {
            // UPDATE
            try {
                const res = await axios.get(SCRIPT_URL, {
                    params: {
                        action: "update",
                        table: "user_characters",
                        id: existingRowId,
                        data: JSON.stringify({ level: newLevel }),
                    },
                    responseType: "text",
                });
                const parsed = parseJsonpResponse(res.data);
                if (parsed.success || parsed.successs) {
                    console.log(
                        "[Character] saveCharacterLevelOnServer(update) 성공:",
                        parsed.data
                    );
                } else {
                    console.warn(
                        "[Character] saveCharacterLevelOnServer(update) 실패:",
                        parsed.data
                    );
                }
            } catch (err) {
                console.error(
                    "Character: saveCharacterLevelOnServer(update) 오류:",
                    err
                );
            }
        } else {
            // INSERT
            const newRowData = {
                id: Date.now().toString() + "_" + charId,
                userid: userid,
                charId: charId,
                level: newLevel,
            };
            try {
                const res = await axios.get(SCRIPT_URL, {
                    params: {
                        action: "insert",
                        table: "user_characters",
                        data: JSON.stringify(newRowData),
                    },
                    responseType: "text",
                });
                const parsed = parseJsonpResponse(res.data);
                if (parsed.success || parsed.successs) {
                    console.log(
                        "[Character] saveCharacterLevelOnServer(insert) 성공:",
                        parsed.data
                    );
                } else {
                    console.warn(
                        "[Character] saveCharacterLevelOnServer(insert) 실패:",
                        parsed.data
                    );
                }
            } catch (err) {
                console.error(
                    "Character: saveCharacterLevelOnServer(insert) 오류:",
                    err
                );
            }
        }
    };

    /**
     * 레벨업 버튼 클릭 시 호출
     */
    const handleLevelUp = async () => {
        if (!currentUserId) return;

        // 1) 서버에서 프로틴을 읽어와 로컬과 동기화
        const serverProtein = await fetchUserProtein(currentUserId);
        const localProtein = getUserExp();
        if (localProtein !== serverProtein) {
            localStorage.setItem(getUserExpKey(currentUserId), serverProtein);
        }

        // 2) 현재 레벨, 필요 프로틴 계산
        const prevLevel = levelMap[selectedCharId] || 1;
        const required = getRequiredProtein(prevLevel);

        if (serverProtein < required) {
            alert("프로틴이 부족합니다! 루틴을 더 기록하세요.");
            return;
        }

        // 3) 레벨업 로직
        const nextLevel = prevLevel + 1;
        const nextProtein = serverProtein - required;

        // 4) 로컬 업데이트 (levelMap, userExp)
        const lvlKey = getLevelKey(currentUserId, selectedCharId);
        localStorage.setItem(lvlKey, nextLevel);
        localStorage.setItem(getUserExpKey(currentUserId), nextProtein);

        setLevelMap((prev) => ({
            ...prev,
            [selectedCharId]: nextLevel,
        }));

        // 5) 서버 “user_characters” 업데이트
        await saveCharacterLevelOnServer(
            currentUserId,
            selectedCharId,
            nextLevel
        );

        // 6) 서버 “users” 프로틴 업데이트
        await updateUserProteinOnServer(currentUserId, nextProtein);
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
                >
                    레벨업 {userExp} / {requiredProteinForNext}
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
