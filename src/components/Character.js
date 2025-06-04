import React, { useState, useEffect } from "react";

// 미리 정의된 캐릭터 목록 (ID, 이름, 이미지 경로)
const CHARACTER_LIST = [
    { id: "daehonggeun", name: "대홍근", img: "/img/character_stage1.png" },
    { id: "daeheehaadu", name: "대희하두", img: "/img/character_stage2.png" },
    { id: "ildungsin", name: "일등신", img: "/img/character_stage3.png" },
    { id: "pulgogi", name: "불고기", img: "/img/character_stage4.png" },
    { id: "galmegi", name: "갈메기", img: "/img/character_stage5.png" },
    { id: "wangtteok", name: "왕떡", img: "/img/character_stage6.png" },
];

export default function Character({ currentUserId }) {
    // 현재 선택된 캐릭터 ID (기본: 첫 번째 캐릭터)
    const [selectedCharId, setSelectedCharId] = useState(CHARACTER_LIST[0].id);
    // { [charId]: { level, exp } } 형태로 캐릭터별 레벨 & 상대 경험치 저장
    const [charDataMap, setCharDataMap] = useState({});

    // “레벨업에 필요한 경험치” 계산: 현재 레벨 x 100
    const getRequiredExp = (level) => level * 100;

    // localStorage에서 저장된 “level-<userId>-<charId>” 및 “expRel-<userId>-<charId>”를 읽어와서
    // charDataMap을 구성하는 함수
    const loadAllCharData = () => {
        if (!currentUserId) {
            setCharDataMap({});
            return;
        }
        const dataMap = {};
        CHARACTER_LIST.forEach(({ id }) => {
            const levelKey = `level-${currentUserId}-${id}`;
            const expKey = `expRel-${currentUserId}-${id}`;

            const storedLevel = parseInt(
                localStorage.getItem(levelKey) || "1",
                10
            );
            const storedRelExp = parseInt(
                localStorage.getItem(expKey) || "0",
                10
            );

            dataMap[id] = {
                level: storedLevel,
                exp: storedRelExp,
            };
        });
        setCharDataMap(dataMap);
    };

    // 마운트되거나 currentUserId가 바뀔 때마다 캐릭터 데이터를 로드
    useEffect(() => {
        loadAllCharData();
    }, [currentUserId]);

    // localStorage 키: 유저 전체 경험치 풀
    const getUserExpKey = (userId) => `userExp-${userId}`;

    // 현재 유저 전체 경험치 풀 값을 가져오는 함수
    const getUserExp = () => {
        if (!currentUserId) return 0;
        const key = getUserExpKey(currentUserId);
        return parseInt(localStorage.getItem(key) || "0", 10);
    };

    // 선택된 캐릭터에 경험치를 추가하는 함수 (amount 만큼 부여)
    const addExpToSelected = (amount = 10) => {
        if (!currentUserId) return;

        // 1) 먼저 “유저 전체 경험치 풀”이 amount 이상인지 체크
        const userExpKey = getUserExpKey(currentUserId);
        const prevUserExp = parseInt(
            localStorage.getItem(userExpKey) || "0",
            10
        );

        if (prevUserExp < amount) {
            alert("유저 경험치 풀이 부족합니다!\n루틴을 더 기록해야합니다.");
            return;
        }

        // 2) 캐릭터별 상대 경험치/레벨 로드
        const charId = selectedCharId;
        const levelKey = `level-${currentUserId}-${charId}`;
        const expKey = `expRel-${currentUserId}-${charId}`;

        const prevLevel = charDataMap[charId]?.level || 1;
        const prevRelExp = charDataMap[charId]?.exp || 0;

        // 이번 레벨에서 레벨업에 필요한 총 경험치
        const requiredExp = getRequiredExp(prevLevel);

        let nextLevel = prevLevel;
        let nextRelExp = prevRelExp + amount;

        // 레벨업 조건: 상대 경험치 >= 필요 경험치
        if (nextRelExp >= requiredExp) {
            nextLevel = prevLevel + 1; // 레벨 1 증가
            nextRelExp = 0; // 상대 경험치를 0으로 초기화
        }

        // 3) 로컬스토리지 업데이트
        // (가) 유저 전체 exp 풀에서 amount만큼 차감
        const nextUserExp = prevUserExp - amount;
        localStorage.setItem(userExpKey, nextUserExp);

        // (나) 캐릭터별 level & relative exp 업데이트
        localStorage.setItem(levelKey, nextLevel);
        localStorage.setItem(expKey, nextRelExp);

        // 4) React 상태 업데이트
        setCharDataMap((prev) => ({
            ...prev,
            [charId]: {
                level: nextLevel,
                exp: nextRelExp,
            },
        }));
    };

    // 현재 선택된 캐릭터 정보
    const selectedCharInfo = CHARACTER_LIST.find(
        (c) => c.id === selectedCharId
    );
    const currentLevel = charDataMap[selectedCharId]?.level || 1;
    const currentRelExp = charDataMap[selectedCharId]?.exp || 0;
    const requiredExpForNext = getRequiredExp(currentLevel);
    const userExp = getUserExp(); // 화면에 보여줄 때 사용

    return (
        <div className="text-center">
            {/** ==========================
          상단: 선택된 캐릭터 큰 뷰
      =========================== **/}
            <div className="mb-4">
                <img
                    src={selectedCharInfo.img}
                    alt={selectedCharInfo.name}
                    className="img-fluid"
                    style={{ width: "200px" }}
                />
                <h3 className="mt-2">{selectedCharInfo.name}</h3>
                <p className="h5 mb-1">LV.: {currentLevel}</p>

                {/** 유저 전체 경험치 풀이 얼마 남았는지 보여주기 */}
                <p className="text-info mb-2">
                    내 EXP: <strong>{userExp}</strong>
                </p>

                {/** 경험치 진행 바 (현재 상대 exp / 필요 exp), 중앙에 텍스트 표시 **/}
                <div
                    className="progress w-75 mx-auto"
                    style={{ height: "24px" }}
                >
                    {(() => {
                        const percent = Math.min(
                            Math.floor(
                                (currentRelExp / requiredExpForNext) * 100
                            ),
                            100
                        );
                        return (
                            <div
                                className="progress-bar bg-success d-flex justify-content-center align-items-center"
                                role="progressbar"
                                style={{ width: `${percent}%` }}
                                aria-valuenow={percent}
                                aria-valuemin="0"
                                aria-valuemax="100"
                            >
                                {currentRelExp} / {requiredExpForNext}
                            </div>
                        );
                    })()}
                </div>

                {/** 테스트용 버튼: 클릭 시 선택된 캐릭터에 +10 EXP **/}
                <button
                    className="btn btn-primary btn-sm mt-3"
                    onClick={() => addExpToSelected(10)}
                    disabled={userExp < 10} // 유저 exp 풀이 10 미만이면 비활성화
                >
                    +10 EXP
                </button>
            </div>

            {/** ===============================
          하단: 캐릭터 카드 그리드 목록
      =============================== **/}
            <div className="container">
                <div className="row gy-3 gx-2 justify-content-center">
                    {CHARACTER_LIST.map((char) => {
                        const lvl = charDataMap[char.id]?.level || 1;
                        const relExp = charDataMap[char.id]?.exp || 0;
                        const reqExp = getRequiredExp(lvl);
                        const isSelected = char.id === selectedCharId;

                        const percent = Math.min(
                            Math.floor((relExp / reqExp) * 100),
                            100
                        );

                        return (
                            <div
                                key={char.id}
                                className="col-6 col-md-4 col-lg-2"
                            >
                                <div
                                    className={
                                        "card h-100 text-center " +
                                        (isSelected ? "border-primary" : "")
                                    }
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setSelectedCharId(char.id)}
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
                                        {/** 작은 경험치 바 **/}
                                        <div
                                            className="progress"
                                            style={{ height: "8px" }}
                                        >
                                            <div
                                                className={
                                                    "progress-bar " +
                                                    (percent < 50
                                                        ? "bg-secondary"
                                                        : percent < 75
                                                        ? "bg-info"
                                                        : "bg-success")
                                                }
                                                role="progressbar"
                                                style={{ width: `${percent}%` }}
                                                aria-valuenow={percent}
                                                aria-valuemin="0"
                                                aria-valuemax="100"
                                            ></div>
                                        </div>
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
