"""
Ampliación opcional (Actividad 8 EVA 4):
Función AWS Lambda invocada por Amazon EventBridge Scheduler cada 7 horas
(expresión cron o rate: `rate(7 hours)`) para generar un snapshot manual de
Amazon RDS PostgreSQL y publicar una alerta en Amazon SNS.

Nota de la pauta: RDS no permite configurar respaldos automáticos nativos
exactamente cada 7 horas (son diarios en ventana de mantenimiento); por ello
se propone EventBridge Scheduler + Lambda para esa periodicidad personalizada.
"""

import os
from datetime import datetime, timezone
import boto3


def lambda_handler(event, context):
    db_instance_id = os.environ.get('RDS_INSTANCE_IDENTIFIER', 'dulce-arte-rds')
    sns_topic_arn = os.environ.get('SNS_TOPIC_ARN', '')
    region = os.environ.get('AWS_REGION', 'us-east-1')

    rds = boto3.client('rds', region_name=region)
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')
    snapshot_id = f'{db_instance_id}-snap-7h-{timestamp}'

    response = rds.create_db_snapshot(
        DBSnapshotIdentifier=snapshot_id,
        DBInstanceIdentifier=db_instance_id,
        Tags=[
            {'Key': 'Proyecto', 'Value': 'DulceArte-EVA4'},
            {'Key': 'Frecuencia', 'Value': 'Cada7Horas'},
        ],
    )

    snapshot_arn = response['DBSnapshot']['DBSnapshotArn']
    mensaje = f'Snapshot RDS programado cada 7h iniciado: {snapshot_id} ({snapshot_arn})'

    if sns_topic_arn:
        sns = boto3.client('sns', region_name=region)
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject='[Dulce Arte AWS] Respaldo RDS 7h iniciado',
            Message=mensaje,
        )

    return {
        'statusCode': 200,
        'snapshot_id': snapshot_id,
        'status': response['DBSnapshot']['Status'],
        'message': mensaje,
    }
