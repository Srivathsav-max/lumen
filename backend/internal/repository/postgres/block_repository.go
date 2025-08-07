package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type BlockRepository struct {
	*repository.BaseRepository
}

func NewBlockRepository(db database.Manager, logger *slog.Logger) repository.BlockRepository {
	return &BlockRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "blocks"),
	}
}

func (r *BlockRepository) Create(ctx context.Context, block *repository.Block) error {
	if block.ID == "" {
		block.ID = uuid.New().String()
	}

	query := `
		INSERT INTO blocks (id, page_id, block_type, block_data, position, parent_block_id,
						   created_at, updated_at, created_by, last_edited_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	now := time.Now().UTC()
	block.CreatedAt = now
	block.UpdatedAt = now

	_, err := r.ExecuteCommand(ctx, query,
		block.ID,
		block.PageID,
		block.BlockType,
		block.BlockData,
		block.Position,
		block.ParentBlockID,
		block.CreatedAt,
		block.UpdatedAt,
		block.CreatedBy,
		block.LastEditedBy,
	)

	if err != nil {
		return r.HandleSQLError(err, "create block")
	}

	r.GetLogger().Info("Block created successfully",
		"block_id", block.ID,
		"page_id", block.PageID,
		"block_type", block.BlockType,
		"position", block.Position)

	return nil
}

func (r *BlockRepository) GetByID(ctx context.Context, id string) (*repository.Block, error) {
	query := `
		SELECT id, page_id, block_type, block_data, position, parent_block_id,
			   created_at, updated_at, created_by, last_edited_by
		FROM blocks 
		WHERE id = $1`

	block := &repository.Block{}
	row := r.ExecuteQueryRow(ctx, query, id)

	err := row.Scan(
		&block.ID,
		&block.PageID,
		&block.BlockType,
		&block.BlockData,
		&block.Position,
		&block.ParentBlockID,
		&block.CreatedAt,
		&block.UpdatedAt,
		&block.CreatedBy,
		&block.LastEditedBy,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get block by id")
	}

	return block, nil
}

func (r *BlockRepository) GetByPageID(ctx context.Context, pageID string) ([]*repository.Block, error) {
	query := `
		SELECT id, page_id, block_type, block_data, position, parent_block_id,
			   created_at, updated_at, created_by, last_edited_by
		FROM blocks 
		WHERE page_id = $1
		ORDER BY position ASC, created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, pageID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get blocks by page id")
	}
	defer rows.Close()

	var blocks []*repository.Block
	for rows.Next() {
		block := &repository.Block{}
		err := rows.Scan(
			&block.ID,
			&block.PageID,
			&block.BlockType,
			&block.BlockData,
			&block.Position,
			&block.ParentBlockID,
			&block.CreatedAt,
			&block.UpdatedAt,
			&block.CreatedBy,
			&block.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan block")
		}
		blocks = append(blocks, block)
	}

	return blocks, nil
}

func (r *BlockRepository) GetByParentID(ctx context.Context, parentBlockID string) ([]*repository.Block, error) {
	query := `
		SELECT id, page_id, block_type, block_data, position, parent_block_id,
			   created_at, updated_at, created_by, last_edited_by
		FROM blocks 
		WHERE parent_block_id = $1
		ORDER BY position ASC, created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, parentBlockID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get blocks by parent id")
	}
	defer rows.Close()

	var blocks []*repository.Block
	for rows.Next() {
		block := &repository.Block{}
		err := rows.Scan(
			&block.ID,
			&block.PageID,
			&block.BlockType,
			&block.BlockData,
			&block.Position,
			&block.ParentBlockID,
			&block.CreatedAt,
			&block.UpdatedAt,
			&block.CreatedBy,
			&block.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan block")
		}
		blocks = append(blocks, block)
	}

	return blocks, nil
}

func (r *BlockRepository) Update(ctx context.Context, block *repository.Block) error {
	query := `
		UPDATE blocks 
		SET block_type = $1, block_data = $2, position = $3, parent_block_id = $4,
			updated_at = $5, last_edited_by = $6
		WHERE id = $7`

	block.UpdatedAt = time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query,
		block.BlockType,
		block.BlockData,
		block.Position,
		block.ParentBlockID,
		block.UpdatedAt,
		block.LastEditedBy,
		block.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update block")
	}

	r.GetLogger().Info("Block updated successfully", "block_id", block.ID)
	return nil
}

func (r *BlockRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM blocks WHERE id = $1`

	_, err := r.ExecuteCommand(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete block")
	}

	r.GetLogger().Info("Block deleted successfully", "block_id", id)
	return nil
}

func (r *BlockRepository) BulkCreate(ctx context.Context, blocks []*repository.Block) error {
	if len(blocks) == 0 {
		return nil
	}

	// Begin transaction
	tx, err := r.GetDB().GetConnection().BeginTx(ctx, nil)
	if err != nil {
		return r.HandleSQLError(err, "begin bulk create transaction")
	}
	defer tx.Rollback()

	query := `
		INSERT INTO blocks (id, page_id, block_type, block_data, position, parent_block_id,
						   created_at, updated_at, created_by, last_edited_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return r.HandleSQLError(err, "prepare bulk create statement")
	}
	defer stmt.Close()

	now := time.Now().UTC()

	for _, block := range blocks {
		if block.ID == "" {
			block.ID = uuid.New().String()
		}
		block.CreatedAt = now
		block.UpdatedAt = now

		_, err := stmt.ExecContext(ctx,
			block.ID,
			block.PageID,
			block.BlockType,
			block.BlockData,
			block.Position,
			block.ParentBlockID,
			block.CreatedAt,
			block.UpdatedAt,
			block.CreatedBy,
			block.LastEditedBy,
		)

		if err != nil {
			return r.HandleSQLError(err, "execute bulk create")
		}
	}

	if err := tx.Commit(); err != nil {
		return r.HandleSQLError(err, "commit bulk create transaction")
	}

	r.GetLogger().Info("Blocks bulk created successfully", "count", len(blocks))
	return nil
}

func (r *BlockRepository) BulkUpdate(ctx context.Context, blocks []*repository.Block) error {
	if len(blocks) == 0 {
		return nil
	}

	// Begin transaction
	tx, err := r.GetDB().GetConnection().BeginTx(ctx, nil)
	if err != nil {
		return r.HandleSQLError(err, "begin bulk update transaction")
	}
	defer tx.Rollback()

	query := `
		UPDATE blocks 
		SET block_type = $1, block_data = $2, position = $3, parent_block_id = $4,
			updated_at = $5, last_edited_by = $6
		WHERE id = $7`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return r.HandleSQLError(err, "prepare bulk update statement")
	}
	defer stmt.Close()

	now := time.Now().UTC()

	for _, block := range blocks {
		block.UpdatedAt = now

		_, err := stmt.ExecContext(ctx,
			block.BlockType,
			block.BlockData,
			block.Position,
			block.ParentBlockID,
			block.UpdatedAt,
			block.LastEditedBy,
			block.ID,
		)

		if err != nil {
			return r.HandleSQLError(err, "execute bulk update")
		}
	}

	if err := tx.Commit(); err != nil {
		return r.HandleSQLError(err, "commit bulk update transaction")
	}

	r.GetLogger().Info("Blocks bulk updated successfully", "count", len(blocks))
	return nil
}

func (r *BlockRepository) BulkDelete(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	query := `DELETE FROM blocks WHERE id = ANY($1)`

	_, err := r.ExecuteCommand(ctx, query, pq.Array(ids))
	if err != nil {
		return r.HandleSQLError(err, "bulk delete blocks")
	}

	r.GetLogger().Info("Blocks bulk deleted successfully", "count", len(ids))
	return nil
}

func (r *BlockRepository) ReorderBlocks(ctx context.Context, pageID string, blockOrders map[string]int) error {
	if len(blockOrders) == 0 {
		return nil
	}

	// Begin transaction
	tx, err := r.GetDB().GetConnection().BeginTx(ctx, nil)
	if err != nil {
		return r.HandleSQLError(err, "begin reorder transaction")
	}
	defer tx.Rollback()

	query := `UPDATE blocks SET position = $1, updated_at = $2 WHERE id = $3 AND page_id = $4`
	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return r.HandleSQLError(err, "prepare reorder statement")
	}
	defer stmt.Close()

	now := time.Now().UTC()

	for blockID, position := range blockOrders {
		_, err := stmt.ExecContext(ctx, position, now, blockID, pageID)
		if err != nil {
			return r.HandleSQLError(err, "execute reorder")
		}
	}

	if err := tx.Commit(); err != nil {
		return r.HandleSQLError(err, "commit reorder transaction")
	}

	r.GetLogger().Info("Blocks reordered successfully",
		"page_id", pageID,
		"blocks_count", len(blockOrders))

	return nil
}

func (r *BlockRepository) GetBlocksByType(ctx context.Context, pageID string, blockType string) ([]*repository.Block, error) {
	query := `
		SELECT id, page_id, block_type, block_data, position, parent_block_id,
			   created_at, updated_at, created_by, last_edited_by
		FROM blocks 
		WHERE page_id = $1 AND block_type = $2
		ORDER BY position ASC, created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, pageID, blockType)
	if err != nil {
		return nil, r.HandleSQLError(err, "get blocks by type")
	}
	defer rows.Close()

	var blocks []*repository.Block
	for rows.Next() {
		block := &repository.Block{}
		err := rows.Scan(
			&block.ID,
			&block.PageID,
			&block.BlockType,
			&block.BlockData,
			&block.Position,
			&block.ParentBlockID,
			&block.CreatedAt,
			&block.UpdatedAt,
			&block.CreatedBy,
			&block.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan block")
		}
		blocks = append(blocks, block)
	}

	return blocks, nil
}