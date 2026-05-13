-- CreateEnum
CREATE TYPE "BuddyRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "match_recommendation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "is_accepted" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cached_user_data" (
    "user_id" TEXT NOT NULL,
    "courses" TEXT[],
    "topics" TEXT[],
    "study_pace" TEXT NOT NULL,
    "study_mode" TEXT NOT NULL,
    "group_size" INTEGER NOT NULL,
    "study_style" TEXT NOT NULL,
    "availability" JSONB NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cached_user_data_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "buddy_request" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "status" "BuddyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buddy_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_recommendation_user_id_idx" ON "match_recommendation"("user_id");

-- CreateIndex
CREATE INDEX "match_recommendation_score_idx" ON "match_recommendation"("score");

-- CreateIndex
CREATE UNIQUE INDEX "match_recommendation_user_id_candidate_id_key" ON "match_recommendation"("user_id", "candidate_id");

-- CreateIndex
CREATE INDEX "buddy_request_from_user_id_idx" ON "buddy_request"("from_user_id");

-- CreateIndex
CREATE INDEX "buddy_request_to_user_id_idx" ON "buddy_request"("to_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "buddy_request_from_user_id_to_user_id_key" ON "buddy_request"("from_user_id", "to_user_id");

